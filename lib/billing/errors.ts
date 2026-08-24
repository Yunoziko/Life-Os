import type { BillingIntervalId, BillingPlanId, FeatureKey } from "@/lib/billing/config";

export class BillingError extends Error {
  readonly code: "not_configured" | "provider" | "invalid" | "ownership" | "network";

  constructor(code: BillingError["code"], message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "BillingError";
    this.code = code;
  }
}

export class EntitlementError extends Error {
  readonly code = "upgrade_required" as const;
  readonly feature: FeatureKey;

  constructor(feature: FeatureKey, message: string) {
    super(message);
    this.name = "EntitlementError";
    this.feature = feature;
  }
}

export type CheckoutSession = {
  keyId: string;
  subscriptionId: string;
  plan: BillingPlanId;
  interval: BillingIntervalId;
  amountLabel: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string };
};

export type ProviderSubscription = {
  id: string;
  customerId: string | null;
  status: string;
  currentStart: number | null;
  currentEnd: number | null;
  endedAt: number | null;
  notes: Record<string, string>;
};

export type CreateSubscriptionInput = {
  userId: string;
  email: string;
  name?: string | null;
  interval: BillingIntervalId;
  customerId?: string | null;
};

export interface BillingProvider {
  readonly id: string;
  isConfigured(): boolean;
  createSubscription(input: CreateSubscriptionInput): Promise<{
    subscription: ProviderSubscription;
    customerId: string;
  }>;
  cancelSubscription(
    providerSubscriptionId: string,
    options: { atPeriodEnd: boolean }
  ): Promise<ProviderSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
}

export const RAZORPAY_STATUS = [
  "created",
  "authenticated",
  "active",
  "pending",
  "halted",
  "cancelled",
  "completed",
  "expired",
  "paused",
] as const;

export type RazorpaySubscriptionStatus = (typeof RAZORPAY_STATUS)[number];

export function isRazorpayStatus(value: string): value is RazorpaySubscriptionStatus {
  return (RAZORPAY_STATUS as readonly string[]).includes(value);
}

export function toSubscriptionStatus(status: string) {
  switch (status) {
    case "created":
      return "CREATED" as const;
    case "authenticated":
      return "AUTHENTICATED" as const;
    case "active":
      return "ACTIVE" as const;
    case "pending":
      return "PENDING" as const;
    case "halted":
      return "HALTED" as const;
    case "cancelled":
      return "CANCELLED" as const;
    case "completed":
      return "COMPLETED" as const;
    case "expired":
      return "EXPIRED" as const;
    case "paused":
      return "PAUSED" as const;
    default:
      return null;
  }
}

export const UPGRADE_COPY: Record<FeatureKey, { title: string; body: string }> = {
  PROJECTS: {
    title: "Unlock more projects",
    body: "Free includes 5 active projects. Upgrade to Pro for an unlimited workspace.",
  },
  GOALS: {
    title: "Unlock more goals",
    body: "Free includes 5 active goals. Pro removes the cap so you can keep every outcome in view.",
  },
  HABITS: {
    title: "Unlock more habits",
    body: "Free includes 10 active habits. Pro lets you track as many as you need.",
  },
  AI_MESSAGES: {
    title: "Unlock more AZIO AI",
    body: "You’ve used this month’s Free AI allowance. Pro raises the limit and unlocks weekly reviews.",
  },
  ADVANCED_ANALYTICS: {
    title: "Unlock advanced analytics",
    body: "Patterns, heatmaps, and deeper trends are part of AZIO Pro.",
  },
  INTEGRATIONS: {
    title: "Unlock more integrations",
    body: "Free includes one connected account. Pro opens Google Calendar, Gmail, and GitHub together.",
  },
  AI_WEEKLY_REVIEW: {
    title: "Unlock AZIO intelligence",
    body: "Weekly reviews and daily briefs are included with Pro.",
  },
  AUTOMATION: {
    title: "Unlock automations",
    body: "Automation is available with AZIO Pro.",
  },
  MEMORIES: {
    title: "Unlock more memories",
    body: "Free includes 25 saved memories. Pro removes the cap so AZIO can keep more of your context.",
  },
};
