import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { verifyRazorpayPaymentSignature } from "./payment-signature";
import { verifyRazorpayWebhookSignature } from "./provider";
import { resolveCheckoutPlan, planAmountPaise } from "./orders";
import { PLAN_CATALOG } from "./config";

test("checkout plan resolution rejects invalid plans", () => {
  assert.throws(() => resolveCheckoutPlan({ plan: "FREE", interval: "MONTHLY" }));
  assert.throws(() => resolveCheckoutPlan({ plan: "PRO", interval: "WEEKLY" }));
  assert.deepEqual(resolveCheckoutPlan({ plan: "PRO", interval: "MONTHLY" }), {
    plan: "PRO",
    interval: "MONTHLY",
  });
});

test("plan amounts come from server catalog", () => {
  assert.equal(planAmountPaise("PRO", "MONTHLY"), PLAN_CATALOG.PRO.monthlyPaise);
  assert.equal(planAmountPaise("PRO", "ANNUAL"), PLAN_CATALOG.PRO.annualPaise);
});

test("payment signatures are verified with order_id|payment_id", () => {
  const secret = "test_key_secret";
  const orderId = "order_test123";
  const paymentId = "pay_test456";
  const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  assert.equal(
    verifyRazorpayPaymentSignature({ orderId, paymentId, signature, secret }),
    true
  );
  assert.equal(
    verifyRazorpayPaymentSignature({ orderId, paymentId, signature: "bad", secret }),
    false
  );
  assert.equal(
    verifyRazorpayPaymentSignature({ orderId: "", paymentId, signature, secret }),
    false
  );
});

test("webhook signatures are verified", () => {
  const body = '{"event":"payment.captured"}';
  const secret = "whsec_test";
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(body, "deadbeef", secret), false);
});
