import { type FailedPayment, type InsertPayment, type DashboardSummary, type FailureCode, type FailureTypeAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getPayments(): Promise<FailedPayment[]>;
  getPayment(id: string): Promise<FailedPayment | undefined>;
  addPayments(payments: InsertPayment[]): Promise<FailedPayment[]>;
  markRecovered(id: string): Promise<FailedPayment | undefined>;
  getDashboardSummary(): Promise<DashboardSummary>;
  clearPayments(): Promise<void>;
}

function analyzeRecoveryDynamically(payments: FailedPayment[]): {
  failureAnalysis: FailureTypeAnalysis[];
  recoverableLow: number;
  recoverableHigh: number;
  insights: string[];
  highValueThreshold: number;
  highValueFailureCount: number;
} {
  const unrecovedPayments = payments.filter(p => !p.recovered);
  if (unrecovedPayments.length === 0) {
    return {
      failureAnalysis: [],
      recoverableLow: 0,
      recoverableHigh: 0,
      insights: [],
      highValueThreshold: 500,
      highValueFailureCount: 0,
    };
  }

  const totalUnrecovered = unrecovedPayments.length;
  const totalUnrecoveredAmount = unrecovedPayments.reduce((s, p) => s + p.amount, 0);

  const byCode: Record<string, FailedPayment[]> = {};
  for (const p of unrecovedPayments) {
    if (!byCode[p.failure_code]) byCode[p.failure_code] = [];
    byCode[p.failure_code].push(p);
  }

  const customerFailureCounts: Record<string, number> = {};
  for (const p of unrecovedPayments) {
    const key = p.customer_email.toLowerCase();
    customerFailureCounts[key] = (customerFailureCounts[key] || 0) + 1;
  }

  const amounts = unrecovedPayments.map(p => p.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)] || 0;
  const p75 = amounts[Math.floor(amounts.length * 0.75)] || median;
  const highValueThreshold = Math.max(p75 * 1.5, 500);

  const highValueFailures = unrecovedPayments.filter(p => p.amount >= highValueThreshold);

  const temporaryCodes = new Set<FailureCode>(["insufficient_funds", "authentication_required"]);
  const customerActionCodes = new Set<FailureCode>(["expired_card"]);

  const failureAnalysis: FailureTypeAnalysis[] = [];

  for (const [code, group] of Object.entries(byCode)) {
    const fc = code as FailureCode;
    const count = group.length;
    const totalAmount = group.reduce((s, p) => s + p.amount, 0);
    const avgAmount = totalAmount / count;
    const percentage = (count / totalUnrecovered) * 100;

    const repeatedEmails = new Set<string>();
    for (const p of group) {
      const email = p.customer_email.toLowerCase();
      if (customerFailureCounts[email] > 1) {
        repeatedEmails.add(email);
      }
    }
    const repeatedCustomerCount = repeatedEmails.size;

    let baseRate: number;
    let action: "retry" | "customer_action" | "alternative_method";
    let actionLabel: string;

    if (temporaryCodes.has(fc)) {
      baseRate = 0.65;
      action = "retry";
      actionLabel = fc === "insufficient_funds"
        ? "Retry after 48 hours, then again after 5 days"
        : "Request authentication, then retry";
    } else if (customerActionCodes.has(fc)) {
      baseRate = 0.45;
      action = "customer_action";
      actionLabel = "Request payment method update";
    } else if (fc === "do_not_honor") {
      baseRate = 0.2;
      action = "alternative_method";
      actionLabel = "Request alternative payment method";
    } else {
      baseRate = 0.25;
      action = "retry";
      actionLabel = "Retry after 48 hours, contact customer if unsuccessful";
    }

    const frequencyBoost = percentage > 40 ? -0.05 : percentage > 25 ? 0 : 0.05;

    const repeatPenalty = repeatedCustomerCount > count * 0.3 ? -0.1 : 0;

    const highValueInGroup = group.filter(p => p.amount >= highValueThreshold).length;
    const highValueRatio = highValueInGroup / count;
    const amountAdjust = highValueRatio > 0.5 ? -0.05 : avgAmount < median * 0.5 ? 0.05 : 0;

    const estimatedRecoveryRate = Math.max(0.05, Math.min(0.85, baseRate + frequencyBoost + repeatPenalty + amountAdjust));
    const recoverableAmount = totalAmount * estimatedRecoveryRate;

    failureAnalysis.push({
      code: fc,
      count,
      percentage: Math.round(percentage),
      totalAmount,
      avgAmount,
      repeatedCustomerCount,
      estimatedRecoveryRate,
      recoverableAmount,
      action,
      actionLabel,
    });
  }

  failureAnalysis.sort((a, b) => b.count - a.count);

  const recoverableMid = failureAnalysis.reduce((s, a) => s + a.recoverableAmount, 0);
  const recoverableLow = recoverableMid * 0.85;
  const recoverableHigh = Math.min(recoverableMid * 1.15, totalUnrecoveredAmount);

  const insights: string[] = [];

  const temporaryAnalysis = failureAnalysis.filter(a => temporaryCodes.has(a.code));
  const temporaryPct = temporaryAnalysis.reduce((s, a) => s + a.percentage, 0);
  if (temporaryPct > 0) {
    insights.push(
      `${temporaryPct}% of failures appear temporary and may succeed on retry.`
    );
  }

  const expiredAnalysis = failureAnalysis.find(a => a.code === "expired_card");
  if (expiredAnalysis && expiredAnalysis.percentage > 0) {
    insights.push(
      `Expired cards account for ${expiredAnalysis.percentage}% of failures and require customers to update payment methods.`
    );
  }

  if (highValueFailures.length > 0) {
    const curr = unrecovedPayments[0]?.currency || "USD";
    insights.push(
      `${highValueFailures.length} payment${highValueFailures.length > 1 ? "s" : ""} above ${formatSimpleCurrency(highValueThreshold, curr)} show${highValueFailures.length === 1 ? "s" : ""} a higher failure frequency.`
    );
  }

  const topReason = failureAnalysis[0];
  if (topReason) {
    const reasonLabel = FAILURE_LABELS_SERVER[topReason.code];
    if (topReason.code === "insufficient_funds") {
      insights.push(
        `Most failures are due to ${reasonLabel.toLowerCase()}, which are typically temporary and often succeed on retry.`
      );
    } else if (topReason.code === "expired_card") {
      insights.push(
        `The most common failure reason is ${reasonLabel.toLowerCase()}. Sending timely card update reminders can significantly improve recovery.`
      );
    } else {
      insights.push(
        `The most common failure reason is ${reasonLabel.toLowerCase()}, accounting for ${topReason.percentage}% of all failures.`
      );
    }
  }

  const totalRepeatedCustomers = new Set(
    unrecovedPayments
      .filter(p => customerFailureCounts[p.customer_email.toLowerCase()] > 1)
      .map(p => p.customer_email.toLowerCase())
  ).size;
  if (totalRepeatedCustomers > 0) {
    insights.push(
      `${totalRepeatedCustomers} customer${totalRepeatedCustomers > 1 ? "s have" : " has"} multiple failed payments, indicating potential billing issues worth investigating.`
    );
  }

  return {
    failureAnalysis,
    recoverableLow,
    recoverableHigh,
    insights,
    highValueThreshold,
    highValueFailureCount: highValueFailures.length,
  };
}

const FAILURE_LABELS_SERVER: Record<FailureCode, string> = {
  insufficient_funds: "Insufficient Funds",
  expired_card: "Expired Card",
  authentication_required: "Authentication Required",
  do_not_honor: "Do Not Honor",
  generic_decline: "Generic Decline",
};

function formatSimpleCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[currency] || currency + " ";
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

const SEED_DATA: InsertPayment[] = [
  { customer_name: "John Smith", customer_email: "john.smith@example.com", amount: 49, currency: "EUR", invoice_id: "INV-2024-001", failure_code: "insufficient_funds", payment_date: "2024-12-15" },
  { customer_name: "Sarah Johnson", customer_email: "sarah.j@example.com", amount: 199, currency: "EUR", invoice_id: "INV-2024-002", failure_code: "expired_card", payment_date: "2024-12-14" },
  { customer_name: "Mike Chen", customer_email: "mike.chen@example.com", amount: 99, currency: "EUR", invoice_id: "INV-2024-003", failure_code: "authentication_required", payment_date: "2024-12-14" },
  { customer_name: "Lisa Wang", customer_email: "lisa.wang@example.com", amount: 349, currency: "EUR", invoice_id: "INV-2024-004", failure_code: "do_not_honor", payment_date: "2024-12-13" },
  { customer_name: "Tom Baker", customer_email: "tom.b@example.com", amount: 29, currency: "EUR", invoice_id: "INV-2024-005", failure_code: "insufficient_funds", payment_date: "2024-12-13" },
  { customer_name: "Emma Davis", customer_email: "emma.d@example.com", amount: 599, currency: "EUR", invoice_id: "INV-2024-006", failure_code: "expired_card", payment_date: "2024-12-12" },
  { customer_name: "Alex Turner", customer_email: "alex.t@example.com", amount: 149, currency: "EUR", invoice_id: "INV-2024-007", failure_code: "generic_decline", payment_date: "2024-12-12" },
  { customer_name: "Nina Patel", customer_email: "nina.p@example.com", amount: 79, currency: "EUR", invoice_id: "INV-2024-008", failure_code: "insufficient_funds", payment_date: "2024-12-11" },
  { customer_name: "John Smith", customer_email: "john.smith@example.com", amount: 49, currency: "EUR", invoice_id: "INV-2024-009", failure_code: "insufficient_funds", payment_date: "2024-12-10" },
  { customer_name: "Carlos Ruiz", customer_email: "carlos.r@example.com", amount: 799, currency: "EUR", invoice_id: "INV-2024-010", failure_code: "do_not_honor", payment_date: "2024-12-10" },
  { customer_name: "Sarah Johnson", customer_email: "sarah.j@example.com", amount: 199, currency: "EUR", invoice_id: "INV-2024-011", failure_code: "expired_card", payment_date: "2024-12-09" },
  { customer_name: "David Kim", customer_email: "david.kim@example.com", amount: 399, currency: "EUR", invoice_id: "INV-2024-012", failure_code: "authentication_required", payment_date: "2024-12-09" },
  { customer_name: "Rachel Green", customer_email: "rachel.g@example.com", amount: 159, currency: "EUR", invoice_id: "INV-2024-013", failure_code: "insufficient_funds", payment_date: "2024-12-08" },
  { customer_name: "James Wilson", customer_email: "james.w@example.com", amount: 89, currency: "EUR", invoice_id: "INV-2024-014", failure_code: "generic_decline", payment_date: "2024-12-08" },
  { customer_name: "Maria Garcia", customer_email: "maria.g@example.com", amount: 249, currency: "EUR", invoice_id: "INV-2024-015", failure_code: "expired_card", payment_date: "2024-12-07" },
];

export class MemStorage implements IStorage {
  private payments: Map<string, FailedPayment>;

  constructor() {
    this.payments = new Map();
    this.seedDemoData();
  }

  private seedDemoData() {
    for (const p of SEED_DATA) {
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
    let recoveredCount = 0;
    let recoveredAmount = 0;

    for (const p of payments) {
      countByReason[p.failure_code]++;
      totalFailedAmount += p.amount;
      if (p.recovered) {
        recoveredCount++;
        recoveredAmount += p.amount;
      }
    }

    const analysis = analyzeRecoveryDynamically(payments);

    return {
      totalFailedPayments: payments.length,
      totalFailedAmount,
      countByReason,
      recoverableRevenueLow: analysis.recoverableLow,
      recoverableRevenueHigh: analysis.recoverableHigh,
      recoveredCount,
      recoveredAmount,
      failureAnalysis: analysis.failureAnalysis,
      insights: analysis.insights,
      highValueThreshold: analysis.highValueThreshold,
      highValueFailureCount: analysis.highValueFailureCount,
      primaryCurrency: this.getPrimaryCurrency(),
    };
  }

  private getPrimaryCurrency(): string {
    const payments = Array.from(this.payments.values());
    if (payments.length === 0) return "EUR";
    const counts: Record<string, number> = {};
    for (const p of payments) {
      counts[p.currency] = (counts[p.currency] || 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
  }

  async clearPayments(): Promise<void> {
    this.payments.clear();
  }
}

export const storage = new MemStorage();
