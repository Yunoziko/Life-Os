import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemorySettingsLoading() {
  return (
    <div>
      <PageHeader
        title="AZIO Memory"
        description="Control what AZIO remembers and uses to personalize your experience."
      />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
