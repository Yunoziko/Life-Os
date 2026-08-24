import { PLAN_CATALOG, type BillingPlanId, type CountableFeature, type FeatureKey } from "@/lib/billing/config";

export function planHasFeature(plan: BillingPlanId, feature: FeatureKey) {
  const limit = PLAN_CATALOG[plan].limits[feature];
  if (typeof limit === "boolean") return limit;
  return true;
}

export function planLimit(plan: BillingPlanId, feature: CountableFeature): number | null {
  return PLAN_CATALOG[plan].limits[feature];
}

export function withinLimit(used: number, limit: number | null) {
  if (limit === null) return true;
  return used < limit;
}

export function usageNearLimit(used: number, limit: number | null) {
  if (limit === null || limit <= 0) return false;
  return used / limit >= 0.8;
}

export function formatLimit(limit: number | null) {
  return limit === null ? "Unlimited" : String(limit);
}

export function formatUsage(used: number, limit: number | null) {
  if (limit === null) return `${used} · Unlimited`;
  return `${used} / ${limit}`;
}

export function subscriptionGrantsPro(input: {
  plan: BillingPlanId | string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  now?: Date;
}) {
  if (input.plan !== "PRO") return false;
  const now = input.now ?? new Date();
  const periodOpen = Boolean(input.currentPeriodEnd && input.currentPeriodEnd.getTime() > now.getTime());

  if (input.status === "ACTIVE" || input.status === "PENDING") return true;
  if (input.status === "PAUSED" && periodOpen) return true;
  if (input.status === "CANCELLED" && input.cancelAtPeriodEnd && periodOpen) return true;
  return false;
}
