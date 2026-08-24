import { NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/lib/billing/webhooks";
import { BillingError } from "@/lib/billing/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const rawBody = await request.text();

  try {
    const result = await processRazorpayWebhook(rawBody, signature);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof BillingError && error.code === "invalid") {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
    if (error instanceof BillingError && error.code === "not_configured") {
      return NextResponse.json({ error: "Webhooks aren’t configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Webhook could not be processed." }, { status: 500 });
  }
}
