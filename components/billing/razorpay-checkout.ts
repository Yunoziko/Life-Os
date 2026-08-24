"use client";

import { toast } from "sonner";
import type { CheckoutSession } from "@/lib/billing/errors";

type RazorpayCheckout = new (options: {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: () => void;
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

export async function openRazorpayCheckout(session: CheckoutSession, onComplete?: () => void) {
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
    subscription_id: session.subscriptionId,
    name: session.name,
    description: session.description,
    prefill: session.prefill,
    theme: { color: "#3f3a32" },
    handler: () => {
      toast.message("Payment received. AZIO will unlock Pro once Razorpay confirms it.");
      onComplete?.();
    },
    modal: {
      ondismiss: () => {
        toast.message("Checkout closed. Your plan is unchanged until payment is confirmed.");
      },
    },
  });
  checkout.open();
}
