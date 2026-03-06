import { type FailedPayment, type InsertPayment, type DashboardSummary, type FailureCode } from "@shared/schema";
import { randomUUID } from "crypto";

const RECOVERY_RATES: Record<FailureCode, number> = {
  insufficient_funds: 0.6,
  expired_card: 0.4,
  authentication_required: 0.7,
  do_not_honor: 0.25,
  generic_decline: 0.3,
};

export interface IStorage {
  getPayments(): Promise<FailedPayment[]>;
  getPayment(id: string): Promise<FailedPayment | undefined>;
  addPayments(payments: InsertPayment[]): Promise<FailedPayment[]>;
  markRecovered(id: string): Promise<FailedPayment | undefined>;
  getDashboardSummary(): Promise<DashboardSummary>;
  clearPayments(): Promise<void>;
}

export class MemStorage implements IStorage {
  private payments: Map<string, FailedPayment>;

  constructor() {
    this.payments = new Map();
    this.seedData();
  }

  private seedData() {
    const demoPayments: InsertPayment[] = [
      { customer_name: "Sarah Johnson", customer_email: "sarah.johnson@example.com", amount: 49.99, currency: "USD", invoice_id: "INV-2024-001", failure_code: "insufficient_funds", payment_date: "2024-12-15" },
      { customer_name: "Michael Chen", customer_email: "m.chen@example.com", amount: 199.00, currency: "USD", invoice_id: "INV-2024-002", failure_code: "expired_card", payment_date: "2024-12-14" },
      { customer_name: "Emily Rodriguez", customer_email: "e.rodriguez@example.com", amount: 29.99, currency: "USD", invoice_id: "INV-2024-003", failure_code: "authentication_required", payment_date: "2024-12-13" },
      { customer_name: "James Wilson", customer_email: "j.wilson@example.com", amount: 99.00, currency: "USD", invoice_id: "INV-2024-004", failure_code: "do_not_honor", payment_date: "2024-12-12" },
      { customer_name: "Lisa Park", customer_email: "lisa.park@example.com", amount: 149.99, currency: "USD", invoice_id: "INV-2024-005", failure_code: "generic_decline", payment_date: "2024-12-11" },
      { customer_name: "David Kim", customer_email: "d.kim@example.com", amount: 79.00, currency: "USD", invoice_id: "INV-2024-006", failure_code: "insufficient_funds", payment_date: "2024-12-10" },
      { customer_name: "Amanda Foster", customer_email: "a.foster@example.com", amount: 249.99, currency: "USD", invoice_id: "INV-2024-007", failure_code: "expired_card", payment_date: "2024-12-09" },
      { customer_name: "Robert Taylor", customer_email: "r.taylor@example.com", amount: 39.99, currency: "USD", invoice_id: "INV-2024-008", failure_code: "authentication_required", payment_date: "2024-12-08" },
      { customer_name: "Nicole Adams", customer_email: "n.adams@example.com", amount: 119.00, currency: "USD", invoice_id: "INV-2024-009", failure_code: "do_not_honor", payment_date: "2024-12-07" },
      { customer_name: "Thomas Brooks", customer_email: "t.brooks@example.com", amount: 59.99, currency: "USD", invoice_id: "INV-2024-010", failure_code: "generic_decline", payment_date: "2024-12-06" },
      { customer_name: "Jennifer Lee", customer_email: "j.lee@example.com", amount: 189.00, currency: "USD", invoice_id: "INV-2024-011", failure_code: "insufficient_funds", payment_date: "2024-12-05" },
      { customer_name: "Chris Martinez", customer_email: "c.martinez@example.com", amount: 349.99, currency: "USD", invoice_id: "INV-2024-012", failure_code: "expired_card", payment_date: "2024-12-04" },
    ];

    for (const p of demoPayments) {
      const id = randomUUID();
      this.payments.set(id, { ...p, id, recovered: false });
    }
  }

  async getPayments(): Promise<FailedPayment[]> {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
  }

  async getPayment(id: string): Promise<FailedPayment | undefined> {
    return this.payments.get(id);
  }

  async addPayments(payments: InsertPayment[]): Promise<FailedPayment[]> {
    const added: FailedPayment[] = [];
    for (const p of payments) {
      const id = randomUUID();
      const payment: FailedPayment = { ...p, id, recovered: false };
      this.payments.set(id, payment);
      added.push(payment);
    }
    return added;
  }

  async markRecovered(id: string): Promise<FailedPayment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    payment.recovered = true;
    this.payments.set(id, payment);
    return payment;
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const payments = Array.from(this.payments.values());
    const countByReason: Record<FailureCode, number> = {
      insufficient_funds: 0,
      expired_card: 0,
      authentication_required: 0,
      do_not_honor: 0,
      generic_decline: 0,
    };

    let totalFailedAmount = 0;
    let estimatedRecoverableRevenue = 0;
    let recoveredCount = 0;
    let recoveredAmount = 0;

    for (const p of payments) {
      countByReason[p.failure_code]++;
      totalFailedAmount += p.amount;
      if (!p.recovered) {
        estimatedRecoverableRevenue += p.amount * RECOVERY_RATES[p.failure_code];
      }
      if (p.recovered) {
        recoveredCount++;
        recoveredAmount += p.amount;
      }
    }

    return {
      totalFailedPayments: payments.length,
      totalFailedAmount,
      countByReason,
      estimatedRecoverableRevenue,
      recoveredCount,
      recoveredAmount,
    };
  }

  async clearPayments(): Promise<void> {
    this.payments.clear();
  }
}

export const storage = new MemStorage();
