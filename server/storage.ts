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
