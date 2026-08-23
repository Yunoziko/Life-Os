import Link from "next/link";
import { ProgressBar } from "@/components/shared/progress-bar";
import { GOAL_PRIORITY_LABEL, GOAL_STATUS_LABEL } from "@/lib/goals/labels";
import { formatShortDate } from "@/lib/utils/date";
import type { GoalOverview } from "@/lib/db/goals";
import type { GoalPriority, GoalStatus } from "@/generated/prisma/enums";

export function GoalCard({
  goal,
  timezone,
}: {
  goal: GoalOverview;
  timezone: string;
}) {
  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-2xl border border-border/70 bg-card p-5 shadow-sm outline-none transition-colors hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium tracking-tight">{goal.title}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {GOAL_STATUS_LABEL[goal.status as GoalStatus]}
        </span>
      </div>
      <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {goal.description || "No description yet."}
      </p>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span className="tabular-nums">{goal.progress}%</span>
      </div>
      <ProgressBar value={goal.progress} label={`${goal.title} progress`} />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {goal.targetDate ? <span>Target {formatShortDate(goal.targetDate, timezone)}</span> : <span>No target date</span>}
        <span>{GOAL_PRIORITY_LABEL[goal.priority as GoalPriority]}</span>
        {goal.category ? <span>{goal.category}</span> : null}
      </div>
    </Link>
  );
}
