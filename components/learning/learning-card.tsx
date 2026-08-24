import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { LEARNING_STATUS_LABEL, LEARNING_TYPE_LABEL } from "@/lib/learning/labels";
import { formatShortDate } from "@/lib/utils/date";
import type { LearningOverview } from "@/lib/db/learning";

export function LearningCard({
  item,
  timezone,
}: {
  item: LearningOverview;
  timezone: string;
}) {
  return (
    <Link
      href={`/learning/${item.id}`}
      className="block rounded-2xl border border-border/70 bg-card p-5 shadow-sm outline-none transition-colors hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium tracking-tight">{item.title}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {LEARNING_STATUS_LABEL[item.status]}
        </span>
      </div>
      <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {item.description || item.provider || "No notes yet."}
      </p>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span className="tabular-nums">{item.progress}%</span>
      </div>
      <ProgressBar value={item.progress} label={`${item.title} progress`} />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{LEARNING_TYPE_LABEL[item.type]}</span>
        {item.provider ? <span>{item.provider}</span> : null}
        {item.targetDate ? <span>Target {formatShortDate(item.targetDate, timezone)}</span> : null}
        {item.goal ? <span>{item.goal.title}</span> : null}
      </div>
    </Link>
  );
}
