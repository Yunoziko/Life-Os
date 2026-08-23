import { Skeleton } from "@/components/ui/skeleton";

export default function GoalDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-2 w-full max-w-md" />
      <Skeleton className="h-8 w-80" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
