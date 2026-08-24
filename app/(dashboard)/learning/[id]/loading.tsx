import { Skeleton } from "@/components/ui/skeleton";

export default function LearningDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-2 w-full max-w-md" />
      <Skeleton className="h-56 max-w-2xl rounded-2xl" />
    </div>
  );
}
