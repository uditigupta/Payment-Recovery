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

export const RECOVERY_RATES: Record<FailureCode, number> = {
  insufficient_funds: 0.6,
  expired_card: 0.4,
  authentication_required: 0.7,
  do_not_honor: 0.25,
  generic_decline: 0.3,
};

export function getRetryRecommendation(code: FailureCode): string {
  switch (code) {
    case "insufficient_funds":
      return "Retry in 2 days, then again 5 days later if still failing. High chance of recovery once funds are available.";
    case "expired_card":
      return "Do not retry until the customer updates their payment method. Send a payment update request immediately.";
    case "authentication_required":
      return "Retry after the customer completes 3D Secure or bank verification. Most customers resolve this quickly.";
    case "do_not_honor":
      return "Retry once after 3 days. If it fails again, ask the customer for an alternative payment method.";
    case "generic_decline":
      return "Retry once after 2 days. If unsuccessful, reach out to the customer for more details.";
  }
}

export function generateEmailTemplate(payment: FailedPayment): string {
  const { customer_name, amount, currency, failure_code, invoice_id } = payment;
  const formattedAmount = `${currency} ${amount.toFixed(2)}`;
  const firstName = customer_name.split(" ")[0];

  switch (failure_code) {
    case "insufficient_funds":
      return `Subject: Action needed: Payment of ${formattedAmount} could not be processed

Hi ${firstName},

We attempted to process your payment of ${formattedAmount} for invoice ${invoice_id}, but it was declined due to insufficient funds.

We will automatically retry this payment in 2 days. To avoid any interruption to your service, please ensure sufficient funds are available in your account.

If you have any questions or need to update your payment method, please don't hesitate to reach out.

Best regards,
Billing Team`;

    case "expired_card":
      return `Subject: Payment method update required - Invoice ${invoice_id}

Hi ${firstName},

Your recent payment of ${formattedAmount} for invoice ${invoice_id} could not be processed because the card on file has expired.

To continue your subscription without interruption, please update your payment method at your earliest convenience.

Here's what you need to do:
1. Log in to your account
2. Navigate to Payment Settings
3. Update your card details

If you need any assistance, we're happy to help.

Best regards,
Billing Team`;

    case "authentication_required":
      return `Subject: Payment verification needed - ${formattedAmount}

Hi ${firstName},

Your payment of ${formattedAmount} for invoice ${invoice_id} requires additional verification from your bank (3D Secure authentication).

We'll retry the payment shortly, and your bank may prompt you to verify the transaction. Please keep an eye out for a notification from your bank and approve the payment when prompted.

This is a standard security measure to protect your account.

Best regards,
Billing Team`;

    case "do_not_honor":
      return `Subject: Payment issue with invoice ${invoice_id}

Hi ${firstName},

We were unable to process your payment of ${formattedAmount} for invoice ${invoice_id}. Your bank declined the transaction.

We recommend contacting your bank to authorize the payment, or you can try an alternative payment method.

We'll attempt one more retry in 3 days. In the meantime, if you'd like to resolve this sooner, please update your payment details or contact us.

Best regards,
Billing Team`;

    case "generic_decline":
      return `Subject: Payment of ${formattedAmount} was declined

Hi ${firstName},

Unfortunately, your payment of ${formattedAmount} for invoice ${invoice_id} was declined by your payment provider.

We'll retry the payment in 2 days. If the issue persists, we recommend:
- Checking with your bank that online transactions are enabled
- Trying a different payment method
- Contacting us for assistance

We're here to help you resolve this quickly.

Best regards,
Billing Team`;
  }
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
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
