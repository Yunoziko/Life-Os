import { prisma } from "@/lib/db/prisma";
import { razorpayWebhookConfigured } from "@/lib/billing/config";
import { BillingError } from "@/lib/billing/errors";
import { verifyRazorpayWebhookSignature } from "@/lib/billing/provider";
import { applyProviderSubscription } from "@/lib/billing/subscriptions";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";

export type RazorpayWebhookPayload = {
  entity?: string;
  event?: string;
  created_at?: number;
  payload?: {
    subscription?: { entity?: Record<string, unknown> };
    payment?: { entity?: Record<string, unknown> };
  };
};

function stringNote(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item)])
  );
}

function asProviderSubscription(entity: Record<string, unknown>) {
  return {
    id: String(entity.id ?? ""),
    customerId: entity.customer_id ? String(entity.customer_id) : null,
    status: String(entity.status ?? "created"),
    currentStart: typeof entity.current_start === "number" ? entity.current_start : null,
    currentEnd: typeof entity.current_end === "number" ? entity.current_end : null,
    endedAt: typeof entity.ended_at === "number" ? entity.ended_at : null,
    notes: stringNote(entity.notes),
  };
}

export function webhookEventKey(event: string, body: RazorpayWebhookPayload) {
  const subscription = body.payload?.subscription?.entity;
  const payment = body.payload?.payment?.entity;
  const subscriptionId = subscription && typeof subscription.id === "string" ? subscription.id : "none";
  const paymentId = payment && typeof payment.id === "string" ? payment.id : "";
  return `razorpay:${event}:${subscriptionId}:${paymentId || body.created_at || "na"}`;
}

export async function processRazorpayWebhook(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!razorpayWebhookConfigured() || !secret) {
    throw new BillingError("not_configured", "Razorpay webhooks aren’t configured on this server yet.");
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
    throw new BillingError("invalid", "Webhook signature did not match.");
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    throw new BillingError("invalid", "Webhook payload could not be read.");
  }

  const event = body.event ?? "";
  const key = webhookEventKey(event, body);
  const already = await prisma.billingWebhookEvent.findUnique({ where: { eventKey: key } });
  if (already) {
    return { ok: true as const, duplicate: true, event };
  }

  try {
    await prisma.billingWebhookEvent.create({
      data: { provider: "razorpay", eventKey: key, eventType: event || "unknown" },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: true as const, duplicate: true, event };
    }
    throw error;
  }

  const entity = body.payload?.subscription?.entity;
  if (entity && typeof entity.id === "string") {
    await applySubscriptionEvent(event, asProviderSubscription(entity), body);
  } else if (event === "payment.failed") {
    await applyPaymentFailure(body);
  }

  revalidateWorkspace(["/settings/billing", "/dashboard", "/pricing"]);
  return { ok: true as const, duplicate: false, event };
}

async function applySubscriptionEvent(
  event: string,
  provider: ReturnType<typeof asProviderSubscription>,
  body: RazorpayWebhookPayload
) {
  if (!provider.id) return;

  const existing = await prisma.subscription.findUnique({
    where: { providerSubscriptionId: provider.id },
  });

  const userId = provider.notes.lifeos_user_id;
  if (!existing) {
    if (!userId) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return;
    await prisma.subscription.create({
      data: {
        userId,
        provider: "razorpay",
        plan: "PRO",
        interval: provider.notes.lifeos_interval === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        ...applyProviderSubscription(
          { cancelAtPeriodEnd: false, lastPaymentError: null },
          provider,
          paymentExtras(event, body)
        ),
      },
    });
    return;
  }

  if (userId && existing.userId !== userId) {
    return;
  }

  await prisma.subscription.update({
    where: { id: existing.id },
    data: applyProviderSubscription(existing, provider, paymentExtras(event, body)),
  });
}

function paymentExtras(event: string, body: RazorpayWebhookPayload) {
  if (event === "subscription.cancelled") {
    return { cancelAtPeriodEnd: false, lastPaymentError: null };
  }
  if (event === "subscription.charged" || event === "subscription.activated") {
    return { lastPaymentError: null as string | null };
  }
  if (event === "subscription.pending" || event === "payment.failed") {
    return { lastPaymentError: "Your Pro payment needs attention." };
  }
  if (event === "subscription.halted") {
    return { lastPaymentError: "Pro billing stopped after repeated payment failures." };
  }
  const payment = body.payload?.payment?.entity;
  if (payment && payment.error_description) {
    return { lastPaymentError: "Your Pro payment needs attention." };
  }
  return {};
}

async function applyPaymentFailure(body: RazorpayWebhookPayload) {
  const payment = body.payload?.payment?.entity;
  const notes = stringNote(payment?.notes);
  const userId = notes.lifeos_user_id;
  if (!userId) return;
  const existing = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!existing) return;
  await prisma.subscription.update({
    where: { id: existing.id },
    data: { lastPaymentError: "Your Pro payment needs attention." },
  });
}
