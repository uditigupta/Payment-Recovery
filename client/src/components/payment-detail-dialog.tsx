import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FailedPayment, FailureCode } from "@shared/schema";
import {
  FAILURE_LABELS,
  FAILURE_COLORS,
  getRetryRecommendation,
  generateEmailTemplate,
  formatCurrency,
  formatDate,
} from "@/lib/payment-utils";
import { Copy, CheckCircle, RefreshCw, Mail, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface PaymentDetailDialogProps {
  payment: FailedPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highValueThreshold?: number;
}

export function PaymentDetailDialog({ payment, open, onOpenChange, highValueThreshold }: PaymentDetailDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const recoverMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/payments/${id}/recover`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Payment marked as recovered" });
      onOpenChange(false);
    },
  });

  if (!payment) return null;

  const emailTemplate = generateEmailTemplate(payment);
  const retryRec = getRetryRecommendation(payment.failure_code as FailureCode, payment.amount, highValueThreshold);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    toast({ title: "Email template copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span>Payment Detail</span>
            {payment.recovered && (
              <Badge variant="default" className="bg-emerald-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Recovered
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <p className="font-medium" data-testid="text-detail-name">{payment.customer_name}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-detail-email">{payment.customer_email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payment Info</p>
              <p className="font-medium" data-testid="text-detail-amount">{formatCurrency(payment.amount, payment.currency)}</p>
              <p className="text-sm text-muted-foreground">{payment.invoice_id} | {formatDate(payment.payment_date)}</p>
            </div>
          </div>

          <div className="p-4 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Failure Classification</p>
            </div>
            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${FAILURE_COLORS[payment.failure_code as FailureCode]}`}>
              {FAILURE_LABELS[payment.failure_code as FailureCode]}
            </span>
          </div>

          <div className="p-4 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Retry Recommendation</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs no-default-active-elevate">
                  {retryRec.action}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {retryRec.timing}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-retry-recommendation">
                {retryRec.detail}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Email Template</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                data-testid="button-copy-email"
              >
                {copied ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre
              className="text-xs bg-muted/50 p-4 rounded-md whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto"
              data-testid="text-email-template"
            >
              {emailTemplate}
            </pre>
          </div>

          {!payment.recovered && (
            <Button
              className="w-full"
              onClick={() => recoverMutation.mutate(payment.id)}
              disabled={recoverMutation.isPending}
              data-testid="button-mark-recovered"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Recovered
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
