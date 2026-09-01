import { prisma } from "@/lib/db/prisma";
import type { SubscriptionStatus } from "@/generated/prisma/enums";
import type { BillingIntervalId } from "@/lib/billing/config";
import { BillingError, toSubscriptionStatus, type CheckoutSession, type ProviderSubscription } from "@/lib/billing/errors";
import { getBillingProvider } from "@/lib/billing/provider";
import { createProCheckoutOrder } from "@/lib/billing/orders";
import { subscriptionGrantsPro } from "@/lib/billing/rules";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";

function unixToDate(value: number | null | undefined) {
  if (!value) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function applyProviderSubscription(
  current: {
    cancelAtPeriodEnd: boolean;
    lastPaymentError: string | null;
  },
  provider: ProviderSubscription,
  extras?: { lastPaymentError?: string | null; cancelAtPeriodEnd?: boolean }
) {
  const status = toSubscriptionStatus(provider.status) ?? "CREATED";
  return {
    providerCustomerId: provider.customerId,
    providerSubscriptionId: provider.id,
    status,
    currentPeriodStart: unixToDate(provider.currentStart),
    currentPeriodEnd: unixToDate(provider.currentEnd ?? provider.endedAt),
    cancelAtPeriodEnd: extras?.cancelAtPeriodEnd ?? current.cancelAtPeriodEnd,
    lastPaymentError:
      extras?.lastPaymentError === undefined ? current.lastPaymentError : extras.lastPaymentError,
  };
}

export async function startProCheckout(input: {
  userId: string;
  email: string;
  name?: string | null;
  interval: BillingIntervalId;
}): Promise<CheckoutSession> {
  return createProCheckoutOrder({
    userId: input.userId,
    email: input.email,
    name: input.name,
    plan: "PRO",
    interval: input.interval,
  });
}

export async function cancelOwnedSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new BillingError("invalid", "There’s no Pro subscription to cancel.");
  }

  if (!subscriptionGrantsPro({
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  })) {
    throw new BillingError("invalid", "This subscription is already inactive.");
  }

  if (subscription.cancelAtPeriodEnd) {
    return subscription;
  }

  if (subscription.providerSubscriptionId) {
    const provider = getBillingProvider();
    const updated = await provider.cancelSubscription(subscription.providerSubscriptionId, {
      atPeriodEnd: true,
    });
    return prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        ...applyProviderSubscription(subscription, updated, { cancelAtPeriodEnd: true }),
      },
    });
  }

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
}

export async function syncOwnedSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    throw new BillingError("invalid", "No billing record is linked to this account.");
  }

  if (subscription.providerSubscriptionId) {
    const provider = getBillingProvider();
    const latest = await provider.getSubscription(subscription.providerSubscriptionId);
    const next = await prisma.subscription.update({
      where: { id: subscription.id },
      data: applyProviderSubscription(subscription, latest),
    });
    revalidateWorkspace(["/settings/billing", "/dashboard"]);
    return next;
  }

  const latestOrder = await prisma.paymentOrder.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (latestOrder?.status === "FAILED" && subscription.lastPaymentError) {
    revalidateWorkspace(["/settings/billing", "/dashboard"]);
    return subscription;
  }

  revalidateWorkspace(["/settings/billing", "/dashboard"]);
  return subscription;
}

export async function cancelPaidSubscriptionsForDeletedUser(userId: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, providerSubscriptionId: { not: null } },
  });
  const provider = getBillingProvider();
  for (const subscription of subscriptions) {
    if (!subscription.providerSubscriptionId) continue;
    if (
      !subscriptionGrantsPro({
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }) &&
      subscription.status !== "CREATED" &&
      subscription.status !== "AUTHENTICATED"
    ) {
      continue;
    }
    try {
      await provider.cancelSubscription(subscription.providerSubscriptionId, { atPeriodEnd: false });
    } catch {
      throw new BillingError(
        "provider",
        "This account has an active Pro subscription. Cancel billing in Settings before deleting the account."
      );
    }
  }
}

export function statusLabel(status: SubscriptionStatus | string) {
  switch (status) {
    case "CREATED":
      return "Awaiting payment";
    case "AUTHENTICATED":
      return "Authorizing";
    case "ACTIVE":
      return "Active";
    case "PENDING":
      return "Payment retrying";
    case "HALTED":
      return "Halted";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
    case "EXPIRED":
      return "Expired";
    case "PAUSED":
      return "Paused";
    default:
      return status;
  }
}

export function needsBillingAttention(status: string | null | undefined) {
  return status === "PENDING" || status === "HALTED";
}
