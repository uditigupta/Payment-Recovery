import { useQuery } from "@tanstack/react-query";
import { FailedPayment, DashboardSummary } from "@shared/schema";
import { SummaryCards } from "@/components/summary-cards";
import { FailureBreakdown } from "@/components/failure-breakdown";
import { CsvUpload } from "@/components/csv-upload";
import { PaymentsTable } from "@/components/payments-table";
import { Shield } from "lucide-react";

export default function Home() {
  const { data: payments, isLoading: paymentsLoading } = useQuery<FailedPayment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard"],
  });

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
                <h1 className="text-lg font-semibold tracking-tight">Payment Recovery</h1>
                <p className="text-xs text-muted-foreground">Recover failed subscription payments</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SummaryCards summary={summary} isLoading={summaryLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <CsvUpload />
            <FailureBreakdown summary={summary} />
          </div>
          <div className="lg:col-span-2">
            <PaymentsTable payments={payments} isLoading={paymentsLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
