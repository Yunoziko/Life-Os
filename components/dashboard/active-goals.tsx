import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { formatRelativeDeadline } from "@/lib/utils/date";
import type { DashboardGoal } from "@/lib/db/dashboard";

export function ActiveGoals({
  goals,
  timezone,
}: {
  goals: DashboardGoal[];
  timezone: string;
}) {
  return (
    <SectionCard
      title="Active goals"
      action={
        <CreateTrigger type="goal" variant="ghost" size="sm">
          + New
        </CreateTrigger>
      }
    >
      {goals.length === 0 ? (
        <SectionEmpty
          title="Create your first goal"
          description="Name one outcome. Progress stays at zero until you move it."
          action={<CreateTrigger type="goal" size="sm">Create a goal</CreateTrigger>}
        />
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Link
                href={`/goals/${goal.id}`}
                className="block rounded-xl outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-3 px-1 py-1">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {goal.progress}%
                  </span>
                </div>
                <div className="mx-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80 transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                  />
                </div>
                {goal.targetDate ? (
                  <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                    {formatRelativeDeadline(goal.targetDate, timezone)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
