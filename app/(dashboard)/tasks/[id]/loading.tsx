import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="ml-auto h-8 w-24" />
      <div className="space-y-4 rounded-2xl border border-border/70 p-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
