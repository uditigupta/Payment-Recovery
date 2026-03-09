import { z } from "zod";

export const failureCodeEnum = z.enum([
  "insufficient_funds",
  "expired_card",
  "do_not_honor",
  "authentication_required",
  "generic_decline",
]);

export type FailureCode = z.infer<typeof failureCodeEnum>;

export const insertPaymentSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  invoice_id: z.string().min(1),
  failure_code: failureCodeEnum,
  payment_date: z.string().min(1),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export interface FailedPayment extends InsertPayment {
  id: string;
  recovered: boolean;
}

export interface FailureTypeAnalysis {
  code: FailureCode;
  count: number;
  percentage: number;
  totalAmount: number;
  avgAmount: number;
  repeatedCustomerCount: number;
  estimatedRecoveryRate: number;
  recoverableAmount: number;
  action: "retry" | "customer_action" | "alternative_method";
  actionLabel: string;
}

export interface DashboardSummary {
  totalFailedPayments: number;
  totalFailedAmount: number;
  countByReason: Record<FailureCode, number>;
  recoverableRevenueLow: number;
  recoverableRevenueHigh: number;
  recoveredCount: number;
  recoveredAmount: number;
  failureAnalysis: FailureTypeAnalysis[];
  insights: string[];
  highValueThreshold: number;
  highValueFailureCount: number;
  primaryCurrency: string;
}
