"use client";

import { toast } from "sonner";
import type { CheckoutSession } from "@/lib/billing/errors";
import { verifyCheckoutPaymentAction } from "@/lib/actions/billing";

type RazorpayCheckout = new (options: {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: { ondismiss?: () => void };
}) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

function loadCheckoutScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-lifeos="razorpay"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("checkout")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.lifeos = "razorpay";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  session: CheckoutSession,
  onComplete?: (result: { activated: boolean }) => void
) {
  try {
    await loadCheckoutScript();
  } catch {
    toast.error("Razorpay Checkout couldn’t load. Check your connection and try again.");
    return;
  }

  if (!window.Razorpay) {
    toast.error("Razorpay Checkout isn’t available right now.");
    return;
  }

  const checkout = new window.Razorpay({
    key: session.keyId,
    order_id: session.orderId,
    amount: session.amount,
    currency: session.currency,
    name: session.name,
    description: session.description,
    prefill: session.prefill,
    theme: { color: "#3f3a32" },
    handler: async (response) => {
      const result = await verifyCheckoutPaymentAction({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });

      if (!result.ok || !result.data?.activated) {
        toast.error(result.ok ? "Payment verification failed." : result.error);
        return;
      }

      toast.success("AZIO Pro is active.");
      onComplete?.({ activated: true });
    },
    modal: {
      ondismiss: () => {
        toast.message("Checkout closed. Your plan is unchanged until payment is confirmed.");
      },
    },
  });
  checkout.open();
}
