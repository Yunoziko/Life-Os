"use server";

import { requireUser } from "@/lib/auth/session";
import { BillingError } from "@/lib/billing/errors";
import { resolveCheckoutPlan, verifyCheckoutPayment } from "@/lib/billing/orders";
import { startProCheckout, cancelOwnedSubscription, syncOwnedSubscription } from "@/lib/billing/subscriptions";
import type { BillingIntervalId } from "@/lib/billing/config";
import type { ActionResult } from "@/types";
import type { CheckoutSession } from "@/lib/billing/errors";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";

function friendly(error: unknown) {
  if (error instanceof RateLimitError) return error.message;
  if (error instanceof BillingError) return error.message;
  return "AZIO couldn’t complete that billing request. Try again in a moment.";
}

export async function startProCheckoutAction(
  plan: string = "PRO",
  interval: BillingIntervalId = "MONTHLY"
): Promise<ActionResult<CheckoutSession>> {
  try {
    const user = await requireUser();
    await assertRateLimit("billing", user.id);
    const resolved = resolveCheckoutPlan({ plan, interval });
    const session = await startProCheckout({
      userId: user.id,
      email: user.email,
      name: user.profile?.displayName ?? user.name,
      interval: resolved.interval,
    });
    return { ok: true, data: session };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

export async function verifyCheckoutPaymentAction(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult<{ activated: boolean }>> {
  try {
    const user = await requireUser();
    await assertRateLimit("billing", user.id);

    if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
      throw new BillingError("invalid", "Payment details were incomplete.");
    }

    const result = await verifyCheckoutPayment({
      userId: user.id,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    });

    revalidateWorkspace(["/settings/billing", "/dashboard", "/pricing"]);
    return { ok: true, data: { activated: result.activated } };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertRateLimit("billing", user.id);
    await cancelOwnedSubscription(user.id);
    revalidateWorkspace(["/settings/billing", "/dashboard"]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

export async function syncSubscriptionAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await assertRateLimit("billing", user.id);
    await syncOwnedSubscription(user.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}
