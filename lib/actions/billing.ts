"use server";

import { requireUser } from "@/lib/auth/session";
import { BillingError } from "@/lib/billing/errors";
import { startProCheckout, cancelOwnedSubscription, syncOwnedSubscription } from "@/lib/billing/subscriptions";
import type { BillingIntervalId } from "@/lib/billing/config";
import type { ActionResult } from "@/types";
import type { CheckoutSession } from "@/lib/billing/errors";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";

function friendly(error: unknown) {
  if (error instanceof BillingError) return error.message;
  return "AZIO couldn’t complete that billing request. Try again in a moment.";
}

export async function startProCheckoutAction(
  interval: BillingIntervalId = "MONTHLY"
): Promise<ActionResult<CheckoutSession>> {
  try {
    const user = await requireUser();
    const safeInterval: BillingIntervalId = interval === "ANNUAL" ? "ANNUAL" : "MONTHLY";
    const session = await startProCheckout({
      userId: user.id,
      email: user.email,
      name: user.profile?.displayName ?? user.name,
      interval: safeInterval,
    });
    return { ok: true, data: session };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
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
    await syncOwnedSubscription(user.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}
