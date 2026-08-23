import { CheckSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getTasks } from "@/lib/db/workspace";
import { formatShortDate } from "@/lib/utils/date";
import { ModulePage } from "@/components/shared/module-page";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { TaskCompleteButton } from "@/components/dashboard/task-complete-button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await getTasks(user.id);
  const timezone = user.profile?.timezone ?? "UTC";

  return (
    <ModulePage
      title="Tasks"
      description="The work that needs to happen. Nothing more."
      icon={CheckSquare}
      emptyTitle="No tasks yet"
      emptyDescription="Create the first one when something actually needs doing."
      action={<CreateTrigger type="task">New task</CreateTrigger>}
      isEmpty={tasks.length === 0}
    >
      <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3 px-4 py-3.5">
            <TaskCompleteButton taskId={task.id} done={task.status === "DONE"} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm",
                  task.status === "DONE" && "text-muted-foreground line-through"
                )}
              >
                {task.title}
              </p>
              {task.description ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
              ) : null}
            </div>
            {task.dueAt ? (
              <span className="text-xs text-muted-foreground">
                {formatShortDate(task.dueAt, timezone)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </ModulePage>
  );
}
