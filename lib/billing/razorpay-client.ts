import Razorpay from "razorpay";
import { razorpayConfigured } from "@/lib/billing/config";
import { BillingError } from "@/lib/billing/errors";

const globalForRazorpay = globalThis as unknown as {
  razorpay?: Razorpay;
};

export function getRazorpayClient(): Razorpay {
  if (!razorpayConfigured()) {
    throw new BillingError("not_configured", "Razorpay isn’t configured on this server yet.");
  }

  if (!globalForRazorpay.razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      throw new BillingError("not_configured", "Razorpay isn’t configured on this server yet.");
    }
    globalForRazorpay.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return globalForRazorpay.razorpay;
}
