import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { LEARNING_TYPE_LABEL } from "@/lib/learning/labels";
import type { DashboardLearning } from "@/lib/db/dashboard";
import type { LearningType } from "@/generated/prisma/enums";

export function CurrentlyLearning({ items }: { items: DashboardLearning[] }) {
  if (items.length === 0) return null;

  return (
    <SectionCard
      title="Currently learning"
      action={
        <CreateTrigger type="learning" variant="ghost" size="sm">
          + Add
        </CreateTrigger>
      }
    >
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/learning/${item.id}`}
              className="block rounded-xl outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3 px-1 py-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {LEARNING_TYPE_LABEL[item.type as LearningType] ?? item.type}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.progress}%</span>
              </div>
              <div className="mx-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/80 transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
