import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getGoalById } from "@/lib/db/workspace";
import { formatRelativeDeadline, formatShortDate } from "@/lib/utils/date";
import { PageHeader } from "@/components/layout/page-header";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Goal" };

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const goal = await getGoalById(user.id, id);

  if (!goal) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <div className="space-y-8">
      <PageHeader
        title={goal.title}
        description={goal.description ?? "An outcome you’re working toward."}
        action={
          <Link href="/goals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All goals
          </Link>
        }
      />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="tabular-nums">{goal.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/80"
            style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {goal.targetDate
            ? `${formatRelativeDeadline(goal.targetDate, timezone)} · ${formatShortDate(goal.targetDate, timezone)}`
            : "No deadline set"}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Linked tasks</h2>
        {goal.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks are linked to this goal yet.</p>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {goal.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <CompleteControl
                  id={task.id}
                  done={task.status === "DONE"}
                  kind="task"
                  label={task.title}
                />
                <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
