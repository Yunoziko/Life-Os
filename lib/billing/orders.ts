import { addMonths, addYears } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import type { BillingInterval, BillingPlan } from "@/generated/prisma/enums";
import {
  PLAN_CATALOG,
  publicRazorpayKeyId,
  razorpayConfigured,
  type BillingIntervalId,
  type BillingPlanId,
} from "@/lib/billing/config";
import { BillingError, type CheckoutSession } from "@/lib/billing/errors";
import { verifyRazorpayPaymentSignature } from "@/lib/billing/payment-signature";
import { getRazorpayClient } from "@/lib/billing/razorpay-client";
import { getUserPlan } from "@/lib/billing/entitlements";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";

const CURRENCY = "INR";

type RazorpayOrderEntity = {
  id?: string;
  amount?: number | string;
  currency?: string;
  notes?: Record<string, string> | string[] | null;
};

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  captured?: boolean;
  notes?: Record<string, string> | string[] | null;
};

export function resolveCheckoutPlan(input: { plan?: string | null; interval?: string | null }): {
  plan: "PRO";
  interval: BillingIntervalId;
} {
  if (input.plan !== "PRO") {
    throw new BillingError("invalid", "Choose a valid Pro plan.");
  }
  if (input.interval !== "MONTHLY" && input.interval !== "ANNUAL") {
    throw new BillingError("invalid", "Choose monthly or annual billing.");
  }
  return { plan: "PRO" as const, interval: input.interval };
}

export function planAmountPaise(plan: BillingPlanId, interval: BillingIntervalId) {
  if (plan !== "PRO") {
    throw new BillingError("invalid", "Only AZIO Pro can be purchased.");
  }
  return interval === "ANNUAL" ? PLAN_CATALOG.PRO.annualPaise : PLAN_CATALOG.PRO.monthlyPaise;
}

function receiptFor(userId: string) {
  return `azio_${userId.replace(/-/g, "").slice(0, 12)}_${Date.now()}`.slice(0, 40);
}

function periodEnd(start: Date, interval: BillingInterval) {
  return interval === "ANNUAL" ? addYears(start, 1) : addMonths(start, 1);
}

function notesOf(value: RazorpayOrderEntity["notes"] | RazorpayPaymentEntity["notes"]) {
  if (!value || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function paymentCaptured(payment: RazorpayPaymentEntity) {
  return payment.status === "captured" || payment.captured === true;
}

export async function createProCheckoutOrder(input: {
  userId: string;
  email: string;
  name?: string | null;
  plan: BillingPlanId;
  interval: BillingIntervalId;
}): Promise<CheckoutSession> {
  if (!razorpayConfigured()) {
    throw new BillingError("not_configured", "Billing isn’t configured on this server yet.");
  }

  if (input.plan !== "PRO") {
    throw new BillingError("invalid", "Only AZIO Pro can be purchased.");
  }

  const currentPlan = await getUserPlan(input.userId);
  if (currentPlan === "PRO") {
    throw new BillingError("invalid", "You’re already on AZIO Pro.");
  }

  const amountPaise = planAmountPaise(input.plan, input.interval);
  const razorpay = getRazorpayClient();
  const order = (await razorpay.orders.create({
    amount: amountPaise,
    currency: CURRENCY,
    receipt: receiptFor(input.userId),
    notes: {
      azio_user_id: input.userId,
      azio_plan: input.plan,
      azio_interval: input.interval,
    },
  })) as RazorpayOrderEntity;

  if (!order.id) {
    throw new BillingError("provider", "AZIO couldn’t create a Razorpay order.");
  }

  await prisma.paymentOrder.create({
    data: {
      userId: input.userId,
      plan: input.plan as BillingPlan,
      interval: input.interval as BillingInterval,
      amountPaise,
      currency: CURRENCY,
      razorpayOrderId: order.id,
      status: "CREATED",
    },
  });

  const definition = PLAN_CATALOG.PRO;
  revalidateWorkspace(["/settings/billing", "/pricing"]);

  return {
    keyId: publicRazorpayKeyId(),
    orderId: order.id,
    amount: amountPaise,
    currency: CURRENCY,
    plan: input.plan,
    interval: input.interval,
    amountLabel: input.interval === "ANNUAL" ? definition.displayAnnual : definition.displayMonthly,
    name: "AZIO Pro",
    description: input.interval === "ANNUAL" ? "AZIO Pro · billed yearly" : "AZIO Pro · billed monthly",
    prefill: { name: input.name ?? undefined, email: input.email },
  };
}

export async function activateProFromPaidOrder(input: {
  paymentOrderId: string;
  razorpayPaymentId: string;
  paidAt?: Date;
}) {
  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { id: input.paymentOrderId },
  });

  if (!paymentOrder) {
    throw new BillingError("invalid", "Payment order not found.");
  }

  if (paymentOrder.status === "PAID") {
    if (paymentOrder.razorpayPaymentId === input.razorpayPaymentId) {
      return { duplicate: true, userId: paymentOrder.userId, subscriptionId: paymentOrder.subscriptionId };
    }
    throw new BillingError("invalid", "This payment was already processed.");
  }

  if (paymentOrder.status !== "CREATED") {
    throw new BillingError("invalid", "This checkout is no longer valid.");
  }

  const paidAt = input.paidAt ?? new Date();
  const periodStart = paidAt;
  const periodEnd = periodEndFor(paymentOrder.interval, periodStart);

  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: paymentOrder.userId },
    orderBy: { createdAt: "desc" },
  });

  const updatedSubscription = existingSubscription
    ? await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan: paymentOrder.plan,
          interval: paymentOrder.interval,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          providerOrderId: paymentOrder.razorpayOrderId,
          cancelAtPeriodEnd: false,
          lastPaymentError: null,
        },
      })
    : await prisma.subscription.create({
        data: {
          userId: paymentOrder.userId,
          provider: "razorpay",
          plan: paymentOrder.plan,
          interval: paymentOrder.interval,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          providerOrderId: paymentOrder.razorpayOrderId,
          cancelAtPeriodEnd: false,
          lastPaymentError: null,
        },
      });

  await prisma.paymentOrder.update({
    where: { id: paymentOrder.id },
    data: {
      status: "PAID",
      razorpayPaymentId: input.razorpayPaymentId,
      paidAt,
      subscriptionId: updatedSubscription.id,
      failureReason: null,
    },
  });

  revalidateWorkspace(["/settings/billing", "/dashboard", "/pricing"]);
  return { duplicate: false, userId: paymentOrder.userId, subscriptionId: updatedSubscription.id };
}

function periodEndFor(interval: BillingInterval, start: Date) {
  return periodEnd(start, interval);
}

export async function verifyCheckoutPayment(input: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    throw new BillingError("not_configured", "Billing isn’t configured on this server yet.");
  }

  if (
    !verifyRazorpayPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      secret,
    })
  ) {
    throw new BillingError("invalid", "Payment verification failed.");
  }

  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (!paymentOrder || paymentOrder.userId !== input.userId) {
    throw new BillingError("ownership", "This payment doesn’t belong to your account.");
  }

  if (paymentOrder.status === "PAID" && paymentOrder.razorpayPaymentId === input.razorpayPaymentId) {
    return { activated: true, duplicate: true };
  }

  const razorpay = getRazorpayClient();
  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(input.razorpayOrderId) as Promise<RazorpayOrderEntity>,
    razorpay.payments.fetch(input.razorpayPaymentId) as Promise<RazorpayPaymentEntity>,
  ]);

  if (payment.order_id !== input.razorpayOrderId) {
    throw new BillingError("invalid", "Payment does not match this order.");
  }

  if (!paymentCaptured(payment)) {
    throw new BillingError("invalid", "Payment has not been captured yet.");
  }

  if (Number(order.amount) !== paymentOrder.amountPaise || order.currency !== paymentOrder.currency) {
    throw new BillingError("invalid", "Payment amount did not match.");
  }

  if (Number(payment.amount) !== paymentOrder.amountPaise || payment.currency !== paymentOrder.currency) {
    throw new BillingError("invalid", "Payment amount did not match.");
  }

  const orderNotes = notesOf(order.notes);
  if (orderNotes.azio_user_id !== input.userId) {
    throw new BillingError("ownership", "This payment doesn’t belong to your account.");
  }

  const result = await activateProFromPaidOrder({
    paymentOrderId: paymentOrder.id,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  return { activated: true, duplicate: result.duplicate };
}

export async function markPaymentOrderFailed(input: {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  reason?: string;
}) {
  const paymentOrder =
    input.razorpayOrderId ?
      await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: input.razorpayOrderId } })
    : input.razorpayPaymentId ?
      await prisma.paymentOrder.findFirst({ where: { razorpayPaymentId: input.razorpayPaymentId } })
    : null;

  if (!paymentOrder || paymentOrder.status === "PAID") return null;

  await prisma.paymentOrder.update({
    where: { id: paymentOrder.id },
    data: {
      status: "FAILED",
      failureReason: input.reason ?? "Payment failed.",
    },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { userId: paymentOrder.userId },
    orderBy: { createdAt: "desc" },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { lastPaymentError: input.reason ?? "Your Pro payment needs attention." },
    });
  }

  revalidateWorkspace(["/settings/billing", "/dashboard"]);
  return paymentOrder.userId;
}

export async function activateProFromWebhook(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}) {
  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });

  if (!paymentOrder) return { handled: false as const };

  if (paymentOrder.status === "PAID" && paymentOrder.razorpayPaymentId === input.razorpayPaymentId) {
    return { handled: true as const, duplicate: true };
  }

  const razorpay = getRazorpayClient();
  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(input.razorpayOrderId) as Promise<RazorpayOrderEntity>,
    razorpay.payments.fetch(input.razorpayPaymentId) as Promise<RazorpayPaymentEntity>,
  ]);

  if (payment.order_id !== input.razorpayOrderId) return { handled: false as const };
  if (!paymentCaptured(payment)) return { handled: false as const };
  if (Number(order.amount) !== paymentOrder.amountPaise) return { handled: false as const };
  if (Number(payment.amount) !== paymentOrder.amountPaise) return { handled: false as const };

  const orderNotes = notesOf(order.notes);
  if (orderNotes.azio_user_id !== paymentOrder.userId) return { handled: false as const };

  await activateProFromPaidOrder({
    paymentOrderId: paymentOrder.id,
    razorpayPaymentId: input.razorpayPaymentId,
  });

  return { handled: true as const, duplicate: false };
}
