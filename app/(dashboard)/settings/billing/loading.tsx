import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div>
      <PageHeader title="Billing" description="Your plan, usage, and AZIO Pro subscription." />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
