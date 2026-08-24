export type BillingPlanId = "FREE" | "PRO";
export type BillingIntervalId = "MONTHLY" | "ANNUAL";
export type FeatureKey =
  | "AI_MESSAGES"
  | "PROJECTS"
  | "GOALS"
  | "HABITS"
  | "ADVANCED_ANALYTICS"
  | "INTEGRATIONS"
  | "AI_WEEKLY_REVIEW";

export type CountableFeature = "AI_MESSAGES" | "PROJECTS" | "GOALS" | "HABITS" | "INTEGRATIONS";
export type BooleanFeature = "ADVANCED_ANALYTICS" | "AI_WEEKLY_REVIEW";

export const FEATURES: FeatureKey[] = [
  "AI_MESSAGES",
  "PROJECTS",
  "GOALS",
  "HABITS",
  "ADVANCED_ANALYTICS",
  "INTEGRATIONS",
  "AI_WEEKLY_REVIEW",
];

export const PRO_BENEFITS = [
  "Unlimited projects",
  "Unlimited goals",
  "Unlimited habits",
  "Advanced analytics",
  "More AI usage",
  "Advanced AZIO intelligence",
  "External integrations",
] as const;

export type PlanDefinition = {
  id: BillingPlanId;
  name: string;
  tagline: string;
  monthlyPaise: number;
  annualPaise: number;
  displayMonthly: string;
  displayAnnual: string;
  limits: {
    PROJECTS: number | null;
    GOALS: number | null;
    HABITS: number | null;
    AI_MESSAGES: number | null;
    INTEGRATIONS: number | null;
    ADVANCED_ANALYTICS: boolean;
    AI_WEEKLY_REVIEW: boolean;
  };
  highlights: string[];
};

export const PLAN_CATALOG: Record<BillingPlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Everything you need to start running your life in one place.",
    monthlyPaise: 0,
    annualPaise: 0,
    displayMonthly: "₹0/month",
    displayAnnual: "₹0/year",
    limits: {
      PROJECTS: 5,
      GOALS: 5,
      HABITS: 10,
      AI_MESSAGES: 100,
      INTEGRATIONS: 1,
      ADVANCED_ANALYTICS: false,
      AI_WEEKLY_REVIEW: false,
    },
    highlights: [
      "Unlimited tasks, notes, and calendar",
      "5 active projects",
      "5 active goals",
      "10 active habits",
      "Limited monthly AI",
      "Basic analytics",
      "1 external integration",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "Unlimited workspace, full AZIO intelligence, and room to grow.",
    monthlyPaise: 49_900,
    annualPaise: 499_900,
    displayMonthly: "₹499/month",
    displayAnnual: "₹4,999/year",
    limits: {
      PROJECTS: null,
      GOALS: null,
      HABITS: null,
      AI_MESSAGES: 2_000,
      INTEGRATIONS: null,
      ADVANCED_ANALYTICS: true,
      AI_WEEKLY_REVIEW: true,
    },
    highlights: [
      "Unlimited projects, goals, and habits",
      "Advanced analytics and patterns",
      "Full AZIO AI with higher limits",
      "Weekly AI review and daily brief",
      "All external integrations",
      "Ready for future automation",
    ],
  },
};

export function formatPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function razorpayConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()
  );
}

export function razorpayWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

export function publicRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() || "";
}

export function razorpayPlanId(interval: BillingIntervalId) {
  const id =
    interval === "ANNUAL"
      ? process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID?.trim()
      : process.env.RAZORPAY_PRO_PLAN_ID?.trim();
  return id || "";
}

export function appOrigin() {
  return (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}
