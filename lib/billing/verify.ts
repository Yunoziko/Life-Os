import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PLAN_CATALOG } from "./config";
import { planHasFeature, planLimit, subscriptionGrantsPro, withinLimit } from "./rules";
import { verifyRazorpayWebhookSignature } from "./provider";

assert.equal(PLAN_CATALOG.FREE.displayMonthly, "₹0/month");
assert.equal(PLAN_CATALOG.PRO.displayMonthly, "₹499/month");
assert.equal(PLAN_CATALOG.PRO.displayAnnual, "₹4,999/year");
assert.equal(planLimit("FREE", "PROJECTS"), 5);
assert.equal(planLimit("FREE", "GOALS"), 5);
assert.equal(planLimit("FREE", "HABITS"), 10);
assert.equal(planLimit("FREE", "AI_MESSAGES"), 100);
assert.equal(planLimit("FREE", "INTEGRATIONS"), 1);
assert.equal(planLimit("PRO", "PROJECTS"), null);
assert.equal(planHasFeature("FREE", "ADVANCED_ANALYTICS"), false);
assert.equal(planHasFeature("PRO", "ADVANCED_ANALYTICS"), true);
assert.equal(planHasFeature("FREE", "AI_WEEKLY_REVIEW"), false);
assert.equal(planHasFeature("PRO", "AI_WEEKLY_REVIEW"), true);
assert.equal(withinLimit(5, 5), false);
assert.equal(withinLimit(4, 5), true);
assert.equal(withinLimit(999, null), true);

const now = new Date("2026-08-24T12:00:00.000Z");
assert.equal(
  subscriptionGrantsPro({
    plan: "PRO",
    status: "ACTIVE",
    currentPeriodEnd: new Date("2026-09-24T12:00:00.000Z"),
    cancelAtPeriodEnd: false,
    now,
  }),
  true
);
assert.equal(
  subscriptionGrantsPro({
    plan: "PRO",
    status: "CANCELLED",
    currentPeriodEnd: new Date("2026-09-24T12:00:00.000Z"),
    cancelAtPeriodEnd: true,
    now,
  }),
  true
);
assert.equal(
  subscriptionGrantsPro({
    plan: "PRO",
    status: "CANCELLED",
    currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
    cancelAtPeriodEnd: true,
    now,
  }),
  false
);
assert.equal(
  subscriptionGrantsPro({
    plan: "PRO",
    status: "HALTED",
    currentPeriodEnd: new Date("2026-09-24T12:00:00.000Z"),
    cancelAtPeriodEnd: false,
    now,
  }),
  false
);
assert.equal(
  subscriptionGrantsPro({
    plan: "PRO",
    status: "PENDING",
    currentPeriodEnd: new Date("2026-09-24T12:00:00.000Z"),
    cancelAtPeriodEnd: false,
    now,
  }),
  true
);

const body = '{"event":"subscription.activated"}';
const secret = "whsec_test";
const signature = createHmac("sha256", secret).update(body).digest("hex");
assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
assert.equal(verifyRazorpayWebhookSignature(body, "deadbeef", secret), false);

console.log("billing entitlement and webhook checks passed");
