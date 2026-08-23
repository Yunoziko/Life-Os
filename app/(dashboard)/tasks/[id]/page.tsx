import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAssignableOptions } from "@/lib/db/tasks";
import { getTaskById } from "@/lib/db/workspace";
import { serializeTask } from "@/lib/tasks/serialize";
import { TaskDetail } from "@/components/tasks/task-detail";
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
  const [task, [projects, goals]] = await Promise.all([
    getTaskById(user.id, id),
    getAssignableOptions(user.id),
  ]);

  if (!task) {
    notFound();
  }

  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-end">
        <Link href="/tasks" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          All tasks
        </Link>
      </div>
      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <TaskDetail
          task={serializeTask(task)}
          timezone={timezone}
          projects={projects}
          goals={goals}
          variant="page"
        />
      </section>
    </div>
  );
}
