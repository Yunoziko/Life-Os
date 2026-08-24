import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { BillingView } from "@/components/billing/billing-view";
import { getEntitlementSnapshot } from "@/lib/billing/entitlements";

export const metadata = { title: "Billing" };

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const timezone = user.profile?.timezone ?? "UTC";
  const snapshot = await getEntitlementSnapshot(user.id, timezone);

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Your plan, usage, and AZIO Pro subscription."
        action={
          <Link href="/pricing" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            View pricing
          </Link>
        }
      />
      <SettingsNav current="billing" />
      <BillingView
        snapshot={snapshot}
        timezone={timezone}
        checkoutPending={params.checkout === "pending"}
      />
    </div>
  );
}
