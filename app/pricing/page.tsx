import { PLAN_CATALOG, PRO_BENEFITS, razorpayConfigured } from "@/lib/billing/config";
import { getSession } from "@/lib/auth/session";
import { PricingView } from "@/components/billing/pricing-view";

export const metadata = {
  title: "Pricing",
  description: "AZIO — Simple pricing. Powerful life management.",
};

export const dynamic = "force-dynamic";

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
