import { useQuery } from "@tanstack/react-query";
import { FailedPayment, DashboardSummary } from "@shared/schema";
import { SummaryCards } from "@/components/summary-cards";
import { FailureBreakdown } from "@/components/failure-breakdown";
import { InsightsPanel } from "@/components/insights-panel";
import { CsvUpload } from "@/components/csv-upload";
import { PaymentsTable } from "@/components/payments-table";
import { Shield, FileSpreadsheet, BarChart3, Mail } from "lucide-react";

export default function Home() {
  const { data: payments, isLoading: paymentsLoading } = useQuery<FailedPayment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard"],
  });

  const hasData = payments && payments.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight" data-testid="text-app-title">Payment Failure Recovery</h1>
                <p className="text-xs text-muted-foreground">Analyze failed payments and recover lost revenue</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!hasData && !paymentsLoading ? (
          <div className="space-y-8">
            <div className="text-center py-8">
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Get started with payment recovery</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Upload a CSV file of your failed payments to analyze failure patterns, get smart retry recommendations, and generate customer email templates.
              </p>
            </div>

            <div className="max-w-xl mx-auto">
              <CsvUpload />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
              <div className="text-center p-5 rounded-md bg-card">
                <div className="mx-auto w-10 h-10 rounded-md bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-medium mb-1">Upload CSV</h3>
                <p className="text-xs text-muted-foreground">Import your failed payment records from any payment processor</p>
              </div>
              <div className="text-center p-5 rounded-md bg-card">
                <div className="mx-auto w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mb-3">
                  <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-medium mb-1">Analyze Patterns</h3>
                <p className="text-xs text-muted-foreground">Dynamic analysis of failure reasons, amounts, and recovery potential</p>
              </div>
              <div className="text-center p-5 rounded-md bg-card">
                <div className="mx-auto w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center mb-3">
                  <Mail className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-medium mb-1">Recover Revenue</h3>
                <p className="text-xs text-muted-foreground">Generate email templates and track recovered payments</p>
              </div>
            </div>

            <div className="max-w-xl mx-auto text-center">
              <p className="text-xs text-muted-foreground">
                Expected CSV columns: customer_name, customer_email, amount, currency, invoice_id, failure_code, payment_date
              </p>
            </div>
          </div>
        ) : (
          <>
            <SummaryCards summary={summary} isLoading={summaryLoading} />

            <InsightsPanel summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <CsvUpload />
                <FailureBreakdown summary={summary} />
              </div>
              <div className="lg:col-span-2">
                <PaymentsTable payments={payments} isLoading={paymentsLoading} highValueThreshold={summary?.highValueThreshold} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
