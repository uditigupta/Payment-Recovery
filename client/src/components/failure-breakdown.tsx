import { Card, CardContent } from "@/components/ui/card";
import { DashboardSummary, FailureCode } from "@shared/schema";
import { FAILURE_LABELS, FAILURE_BAR_COLORS, formatCurrency } from "@/lib/payment-utils";
import { Progress } from "@/components/ui/progress";

interface FailureBreakdownProps {
  summary: DashboardSummary | undefined;
}

export function FailureBreakdown({ summary }: FailureBreakdownProps) {
  if (!summary || summary.failureAnalysis.length === 0) return null;

  return (
    <Card data-testid="card-failure-breakdown">
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4">Failure Distribution</h3>
        <div className="space-y-4">
          {summary.failureAnalysis.map((analysis) => (
            <div key={analysis.code} data-testid={`breakdown-${analysis.code}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm">{FAILURE_LABELS[analysis.code]}</span>
                <span className="text-sm font-medium tabular-nums">
                  {analysis.count} ({analysis.percentage}%)
                </span>
              </div>
              <Progress
                value={analysis.percentage}
                className={`h-2 ${FAILURE_BAR_COLORS[analysis.code]}`}
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {analysis.actionLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  ~{formatCurrency(analysis.recoverableAmount)} recoverable
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
