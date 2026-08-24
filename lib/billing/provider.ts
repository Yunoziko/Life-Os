import { createHmac, timingSafeEqual } from "node:crypto";
import { razorpayPlanId, razorpayConfigured } from "@/lib/billing/config";
import {
  BillingError,
  isRazorpayStatus,
  type BillingProvider,
  type CreateSubscriptionInput,
  type ProviderSubscription,
} from "@/lib/billing/errors";

const API = "https://api.razorpay.com/v1";

type RazorpayEntity = {
  id?: string;
  customer_id?: string | null;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  notes?: Record<string, string> | string[] | null;
};

function authHeader() {
  const key = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key || !secret) {
    throw new BillingError("not_configured", "Razorpay isn’t configured on this server yet.");
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

function notesOf(value: RazorpayEntity["notes"]): Record<string, string> {
  if (!value || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

function asSubscription(entity: RazorpayEntity): ProviderSubscription {
  if (!entity.id) {
    throw new BillingError("provider", "LifeOS couldn’t read that Razorpay subscription.");
  }
  return {
    id: entity.id,
    customerId: entity.customer_id ?? null,
    status: entity.status ?? "created",
    currentStart: entity.current_start ?? null,
    currentEnd: entity.current_end ?? null,
    endedAt: entity.ended_at ?? null,
    notes: notesOf(entity.notes),
  };
}

async function razorpayFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  }).catch((error) => {
    throw new BillingError("network", "LifeOS couldn’t reach Razorpay just then.", { cause: error });
  });

  const json = (await response.json().catch(() => null)) as
    | RazorpayEntity
    | { error?: { description?: string } }
    | null;

  if (!response.ok) {
    throw new BillingError("provider", "LifeOS couldn’t complete that billing request. Try again in a moment.");
  }

  return json as RazorpayEntity;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export class RazorpayBillingProvider implements BillingProvider {
  readonly id = "razorpay";

  isConfigured() {
    return razorpayConfigured();
  }

  async createSubscription(input: CreateSubscriptionInput) {
    if (!this.isConfigured()) {
      throw new BillingError("not_configured", "Razorpay isn’t configured on this server yet.");
    }

    const planId = razorpayPlanId(input.interval);
    if (!planId) {
      throw new BillingError(
        "not_configured",
        input.interval === "ANNUAL"
          ? "The annual Pro plan isn’t configured yet."
          : "The monthly Pro plan isn’t configured yet."
      );
    }

    let customerId = input.customerId ?? "";
    if (!customerId) {
      const customer = await razorpayFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: input.name?.trim() || "LifeOS",
          email: input.email,
          fail_existing: 0,
          notes: { lifeos_user_id: input.userId },
        }),
      });
      if (!customer.id) {
        throw new BillingError("provider", "LifeOS couldn’t create a Razorpay customer.");
      }
      customerId = customer.id;
    }

    const totalCount = input.interval === "ANNUAL" ? 20 : 120;
    const created = await razorpayFetch("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        customer_id: customerId,
        total_count: totalCount,
        customer_notify: 1,
        notes: {
          lifeos_user_id: input.userId,
          lifeos_plan: "PRO",
          lifeos_interval: input.interval,
        },
      }),
    });

    const subscription = asSubscription(created);
    if (!isRazorpayStatus(subscription.status) && subscription.status !== "created") {
      throw new BillingError("provider", "Razorpay returned an unexpected subscription state.");
    }

    return { subscription, customerId };
  }

  async cancelSubscription(providerSubscriptionId: string, options: { atPeriodEnd: boolean }) {
    const entity = await razorpayFetch(`/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: options.atPeriodEnd ? 1 : 0 }),
    });
    return asSubscription(entity);
  }

  async getSubscription(providerSubscriptionId: string) {
    const entity = await razorpayFetch(`/subscriptions/${providerSubscriptionId}`);
    return asSubscription(entity);
  }
}

export function getBillingProvider(): BillingProvider {
  return new RazorpayBillingProvider();
}
