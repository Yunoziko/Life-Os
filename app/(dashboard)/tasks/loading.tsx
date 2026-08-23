import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-8 w-full max-w-xl" />
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2 rounded-2xl border border-border/70 p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
