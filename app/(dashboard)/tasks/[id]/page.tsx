import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTaskById } from "@/lib/db/workspace";
import { formatShortDate, formatTime } from "@/lib/utils/date";
import { PageHeader } from "@/components/layout/page-header";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Task" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const task = await getTaskById(user.id, id);

  if (!task) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";
  const done = task.status === "DONE";

  return (
    <div className="space-y-8">
      <PageHeader
        title={task.title}
        description={task.description ?? "A single piece of work."}
        action={
          <Link href="/tasks" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All tasks
          </Link>
        }
      />

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CompleteControl id={task.id} done={done} kind="task" label={task.title} />
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {done ? "Completed" : task.status === "IN_PROGRESS" ? "In progress" : "Open"}
              {task.priority !== "NONE" ? ` · ${task.priority.toLowerCase()} priority` : ""}
            </p>
            {task.dueAt ? (
              <p className="text-muted-foreground">
                Due {formatShortDate(task.dueAt, timezone)} · {formatTime(task.dueAt, timezone)}
              </p>
            ) : null}
            {task.project ? (
              <p className="text-muted-foreground">Project · {task.project.name}</p>
            ) : null}
            {task.goal ? (
              <p>
                <Link href={`/goals/${task.goal.id}`} className="text-muted-foreground hover:underline">
                  Goal · {task.goal.title}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
