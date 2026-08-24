import { Skeleton } from "@/components/ui/skeleton";

export default function AILoading() {
  return (
    <div className="-mx-4 -mb-24 -mt-6 flex h-[calc(100dvh-3.5rem-4.75rem)] min-h-[28rem] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mb-10 lg:h-[calc(100dvh-3.5rem)]">
      <div className="hidden w-64 border-r border-border/70 p-4 lg:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-full" />
        <Skeleton className="mt-2 h-8 w-5/6" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-auto space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
