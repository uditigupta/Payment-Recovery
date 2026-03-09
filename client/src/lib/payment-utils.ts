import type { FailureCode, FailedPayment } from "@shared/schema";

export const FAILURE_LABELS: Record<FailureCode, string> = {
  insufficient_funds: "Insufficient Funds",
  expired_card: "Expired Card",
  authentication_required: "Authentication Required",
  do_not_honor: "Do Not Honor",
  generic_decline: "Generic Decline",
};

export const FAILURE_COLORS: Record<FailureCode, string> = {
  insufficient_funds: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  expired_card: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  authentication_required: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  do_not_honor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  generic_decline: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export const FAILURE_BAR_COLORS: Record<FailureCode, string> = {
  insufficient_funds: "[&>div]:bg-amber-500",
  expired_card: "[&>div]:bg-red-500",
  authentication_required: "[&>div]:bg-blue-500",
  do_not_honor: "[&>div]:bg-purple-500",
  generic_decline: "[&>div]:bg-gray-500",
};

export function getRetryRecommendation(code: FailureCode, amount?: number, highValueThreshold: number = 500): { action: string; detail: string; timing: string } {
  const isHighValue = amount !== undefined && amount >= highValueThreshold;

  switch (code) {
    case "insufficient_funds":
      return {
        action: "Retry automatically",
        timing: isHighValue ? "Retry after 5 days" : "Retry after 48 hours",
        detail: isHighValue
          ? "High-value payments with insufficient funds may take longer to resolve. Retry after 5 days, then contact the customer if still failing."
          : "This is typically a temporary issue. Retry in 48 hours — most customers resolve this quickly once funds are available.",
      };
    case "expired_card":
      return {
        action: "Request payment method update",
        timing: "Send update request immediately",
        detail: "The card on file has expired. Do not retry until the customer updates their payment method. Send a payment update request right away.",
      };
    case "authentication_required":
      return {
        action: "Request authentication",
        timing: "Retry after customer verifies",
        detail: "The customer's bank requires additional verification (3D Secure). Prompt the customer to complete verification, then retry.",
      };
    case "do_not_honor":
      return {
        action: "Request alternative payment method",
        timing: "Retry once after 3 days",
        detail: "The bank declined this transaction without a specific reason. Retry once after 3 days. If it fails again, ask the customer to try a different payment method or contact their bank.",
      };
    case "generic_decline":
      return {
        action: "Retry, then contact customer",
        timing: "Retry after 48 hours",
        detail: "A general decline was received. Retry once after 48 hours. If unsuccessful, reach out to the customer to investigate further.",
      };
  }
}

export function generateEmailTemplate(payment: FailedPayment): string {
  const { customer_name, amount, currency, failure_code, invoice_id } = payment;
  const formattedAmount = formatCurrency(amount, currency);
  const firstName = customer_name.split(" ")[0];

  switch (failure_code) {
    case "insufficient_funds":
      return `Subject: Payment update — we'll retry your payment of ${formattedAmount}

Hi ${firstName},

We attempted to process your payment of ${formattedAmount} for invoice ${invoice_id} but were unable to complete the transaction. This often happens when there are temporary issues with available funds.

We'll automatically retry the payment in a couple of days. If you'd like to resolve this sooner, you can update your payment method or ensure sufficient funds are available.

If you have any questions, we're happy to help.

Best regards,
Billing Team`;

    case "expired_card":
      return `Subject: Action needed — please update your payment method

Hi ${firstName},

Your recent payment of ${formattedAmount} for invoice ${invoice_id} could not be processed because the card on file has expired.

To continue your subscription without interruption, please update your payment method:

1. Log in to your account
2. Go to Payment Settings
3. Add your new card details

This only takes a moment. If you need any help, just reply to this email.

Best regards,
Billing Team`;

    case "authentication_required":
      return `Subject: Quick action needed — verify your payment of ${formattedAmount}

Hi ${firstName},

Your payment of ${formattedAmount} for invoice ${invoice_id} requires a quick verification step from your bank (this is a standard security measure).

We'll retry the payment shortly, and your bank will prompt you to approve it. Please keep an eye out for a notification and approve the transaction when prompted.

If you have any trouble, don't hesitate to reach out.

Best regards,
Billing Team`;

    case "do_not_honor":
      return `Subject: Payment issue with invoice ${invoice_id}

Hi ${firstName},

We were unable to process your payment of ${formattedAmount} for invoice ${invoice_id}. Your bank declined the transaction without specifying a reason.

We recommend:
- Contacting your bank to authorize future payments to us
- Or trying an alternative payment method

We'll attempt one more retry in a few days. If you'd like to resolve this sooner, please update your payment details or get in touch with us.

Best regards,
Billing Team`;

    case "generic_decline":
      return `Subject: We had trouble processing your payment of ${formattedAmount}

Hi ${firstName},

Unfortunately, your payment of ${formattedAmount} for invoice ${invoice_id} was declined by your payment provider.

We'll retry the payment in a couple of days. In the meantime, you might want to:
- Check with your bank that online transactions are enabled
- Try adding a different payment method
- Contact us if you need any assistance

We're here to help you resolve this quickly.

Best regards,
Billing Team`;
  }
}

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
