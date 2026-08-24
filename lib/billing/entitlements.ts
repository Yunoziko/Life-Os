import { prisma } from "@/lib/db/prisma";
import { PLAN_CATALOG, type BillingPlanId, type CountableFeature, type FeatureKey } from "@/lib/billing/config";
import { EntitlementError, UPGRADE_COPY } from "@/lib/billing/errors";
import { planHasFeature, planLimit, withinLimit, subscriptionGrantsPro } from "@/lib/billing/rules";
import { getAIUsageCount, monthPeriod } from "@/lib/billing/usage";

const ACTIVE_PROJECTS = ["PLANNED", "ACTIVE", "ON_HOLD"] as ["PLANNED", "ACTIVE", "ON_HOLD"];
const ACTIVE_GOALS = ["NOT_STARTED", "ACTIVE", "PAUSED"] as ["NOT_STARTED", "ACTIVE", "PAUSED"];

export async function getUserPlan(userId: string): Promise<BillingPlanId> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (
    subscription &&
    subscriptionGrantsPro({
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    })
  ) {
    return "PRO";
  }

  return "FREE";
}

export async function canUseFeature(userId: string, feature: FeatureKey) {
  const plan = await getUserPlan(userId);
  if (!planHasFeature(plan, feature)) return false;
  if (feature === "ADVANCED_ANALYTICS" || feature === "AI_WEEKLY_REVIEW" || feature === "AUTOMATION") return true;
  const check = await checkUsageLimit(userId, feature);
  return check.allowed;
}

export async function checkUsageLimit(userId: string, feature: FeatureKey) {
  const plan = await getUserPlan(userId);
  const usage = await getUsage(userId);
  if (feature === "ADVANCED_ANALYTICS" || feature === "AI_WEEKLY_REVIEW" || feature === "AUTOMATION") {
    const allowed = planHasFeature(plan, feature);
    return { allowed, used: allowed ? 1 : 0, limit: allowed ? null : 0, plan };
  }
  const used = usage[feature];
  const limit = planLimit(plan, feature);
  return { allowed: withinLimit(used, limit), used, limit, plan };
}

export async function getUsage(userId: string, timeZone = "UTC") {
  const [projects, goals, habits, integrations, messages] = await Promise.all([
    prisma.project.count({ where: { userId, status: { in: ACTIVE_PROJECTS } } }),
    prisma.goal.count({ where: { userId, status: { in: ACTIVE_GOALS } } }),
    prisma.habit.count({ where: { userId, archived: false } }),
    prisma.integrationAccount.count({
      where: { userId, status: "CONNECTED", accessTokenEncrypted: { not: null } },
    }),
    getAIUsageCount(userId, timeZone),
  ]);

  return {
    PROJECTS: projects,
    GOALS: goals,
    HABITS: habits,
    INTEGRATIONS: integrations,
    AI_MESSAGES: messages,
  } satisfies Record<CountableFeature, number>;
}

export async function assertCanUseFeature(userId: string, feature: FeatureKey) {
  const plan = await getUserPlan(userId);
  if (!planHasFeature(plan, feature)) {
    throw new EntitlementError(feature, UPGRADE_COPY[feature].body);
  }
}

export async function assertWithinLimit(userId: string, feature: CountableFeature) {
  const check = await checkUsageLimit(userId, feature);
  if (!check.allowed) {
    throw new EntitlementError(feature, UPGRADE_COPY[feature].body);
  }
  return check;
}

export async function assertAIUsage(userId: string, timeZone = "UTC") {
  const plan = await getUserPlan(userId);
  const used = await getAIUsageCount(userId, timeZone);
  const limit = planLimit(plan, "AI_MESSAGES");
  if (!withinLimit(used, limit)) {
    throw new EntitlementError("AI_MESSAGES", UPGRADE_COPY.AI_MESSAGES.body);
  }
}

export async function getEntitlementSnapshot(userId: string, timeZone = "UTC") {
  const [plan, usage, subscription] = await Promise.all([
    getUserPlan(userId),
    getUsage(userId, timeZone),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const period = monthPeriod(timeZone);
  const definition = PLAN_CATALOG[plan];

  return {
    plan,
    definition,
    usage,
    limits: definition.limits,
    period,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          interval: subscription.interval,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          lastPaymentError: subscription.lastPaymentError,
          grantsPro: subscriptionGrantsPro({
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }),
        }
      : null,
  };
}

export function featureFromCreate(type: "project" | "goal" | "habit"): CountableFeature {
  if (type === "project") return "PROJECTS";
  if (type === "goal") return "GOALS";
  return "HABITS";
}

export async function getBillingChrome(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      lastPaymentError: true,
    },
  });
  const pro = Boolean(
    subscription &&
      subscriptionGrantsPro({
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      })
  );
  const warning =
    subscription?.lastPaymentError ||
    (subscription && (subscription.status === "PENDING" || subscription.status === "HALTED")
      ? "Your Pro payment needs attention."
      : null);
  return { plan: (pro ? "PRO" : "FREE") as BillingPlanId, warning };
}
