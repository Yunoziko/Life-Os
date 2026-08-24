import { PLAN_CATALOG, PRO_BENEFITS, razorpayConfigured } from "@/lib/billing/config";
import { getSession } from "@/lib/auth/session";
import { PricingView } from "@/components/billing/pricing-view";

export const metadata = {
  title: "Pricing",
  description: "LifeOS Free and Pro — a quieter operating system for your life.",
};

export default async function PricingPage() {
  const session = await getSession();
  return (
    <PricingView
      signedIn={Boolean(session?.user)}
      billingReady={razorpayConfigured()}
      plans={[PLAN_CATALOG.FREE, PLAN_CATALOG.PRO]}
      benefits={[...PRO_BENEFITS]}
    />
  );
}
