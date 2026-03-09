import { Card, CardContent } from "@/components/ui/card";
import { DashboardSummary } from "@shared/schema";
import { formatCurrency } from "@/lib/payment-utils";
import { Lightbulb, TrendingUp, Info } from "lucide-react";

interface InsightsPanelProps {
  summary: DashboardSummary | undefined;
}

export function InsightsPanel({ summary }: InsightsPanelProps) {
  if (!summary || summary.totalFailedPayments === 0) return null;

  const currency = summary.primaryCurrency || "EUR";
  const lowFormatted = formatCurrency(summary.recoverableRevenueLow, currency);
  const highFormatted = formatCurrency(summary.recoverableRevenueHigh, currency);
  const totalFormatted = formatCurrency(summary.totalFailedAmount, currency);

  return (
    <Card data-testid="card-insights-panel">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
            <Lightbulb className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold">Recoverable Revenue Insight</h3>
        </div>

        <div className="p-4 rounded-md bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30 mb-4">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed" data-testid="text-recoverable-summary">
              Based on the failure patterns in your uploaded data, approximately{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {lowFormatted} – {highFormatted}
              </span>{" "}
              of the {totalFormatted} failed revenue may be recoverable with retry attempts or payment method updates.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {summary.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2" data-testid={`insight-${i}`}>
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
