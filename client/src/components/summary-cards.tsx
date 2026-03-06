import { Card, CardContent } from "@/components/ui/card";
import { DashboardSummary } from "@shared/schema";
import { formatCurrency } from "@/lib/payment-utils";
import { AlertTriangle, DollarSign, TrendingUp, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardsProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-loading">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: "Failed Payments",
      value: summary.totalFailedPayments.toString(),
      icon: AlertTriangle,
      iconColor: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      testId: "card-failed-payments",
    },
    {
      title: "Total Failed Amount",
      value: formatCurrency(summary.totalFailedAmount),
      icon: DollarSign,
      iconColor: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      testId: "card-failed-amount",
    },
    {
      title: "Estimated Recoverable",
      value: formatCurrency(summary.estimatedRecoverableRevenue),
      icon: TrendingUp,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      testId: "card-recoverable",
    },
    {
      title: "Recovered",
      value: `${summary.recoveredCount} (${formatCurrency(summary.recoveredAmount)})`,
      icon: CheckCircle,
      iconColor: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      testId: "card-recovered",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.testId} data-testid={card.testId}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <div className={`p-2 rounded-md ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold mt-2 tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
