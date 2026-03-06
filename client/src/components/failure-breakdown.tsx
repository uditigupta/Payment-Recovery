import { Card, CardContent } from "@/components/ui/card";
import { DashboardSummary, FailureCode } from "@shared/schema";
import { FAILURE_LABELS, RECOVERY_RATES } from "@/lib/payment-utils";
import { Progress } from "@/components/ui/progress";

interface FailureBreakdownProps {
  summary: DashboardSummary | undefined;
}

export function FailureBreakdown({ summary }: FailureBreakdownProps) {
  if (!summary) return null;

  const total = summary.totalFailedPayments || 1;
  const codes = Object.entries(summary.countByReason)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a) as [FailureCode, number][];

  const barColors: Record<FailureCode, string> = {
    insufficient_funds: "[&>div]:bg-amber-500",
    expired_card: "[&>div]:bg-red-500",
    authentication_required: "[&>div]:bg-blue-500",
    do_not_honor: "[&>div]:bg-purple-500",
    generic_decline: "[&>div]:bg-gray-500",
  };

  return (
    <Card data-testid="card-failure-breakdown">
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4">Failure Breakdown</h3>
        <div className="space-y-4">
          {codes.map(([code, count]) => {
            const pct = Math.round((count / total) * 100);
            return (
              <div key={code} data-testid={`breakdown-${code}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm">{FAILURE_LABELS[code]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(RECOVERY_RATES[code] * 100)}% recoverable
                    </span>
                    <span className="text-sm font-medium tabular-nums">{count} ({pct}%)</span>
                  </div>
                </div>
                <Progress value={pct} className={`h-2 ${barColors[code]}`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
