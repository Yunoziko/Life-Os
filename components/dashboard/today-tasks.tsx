import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { formatShortDate, formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { DashboardTask } from "@/lib/db/dashboard";

const priorityLabel: Record<DashboardTask["priority"], string | null> = {
  NONE: null,
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function TodayTasks({
  tasks,
  timezone,
}: {
  tasks: DashboardTask[];
  timezone: string;
}) {
  return (
    <SectionCard
      title="Today’s tasks"
      action={
        <CreateTrigger type="task" variant="ghost" size="sm">
          + Add task
        </CreateTrigger>
      }
    >
      {tasks.length === 0 ? (
        <SectionEmpty
          title="Your day is wide open."
          description="Create a task and start building momentum."
          action={<CreateTrigger type="task" size="sm">Create task</CreateTrigger>}
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {tasks.map((task) => {
            const done = task.status === "DONE";
            const priority = priorityLabel[task.priority];
            return (
              <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <CompleteControl id={task.id} done={done} kind="task" label={task.title} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tasks/${task.id}`}
                    className={cn(
                      "block truncate text-sm outline-none hover:text-foreground focus-visible:underline",
                      done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {task.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {priority ? (
                      <span
                        className={cn(
                          task.priority === "URGENT" || task.priority === "HIGH"
                            ? "text-foreground/80"
                            : undefined
                        )}
                      >
                        {priority}
                      </span>
                    ) : null}
                    {task.dueAt ? (
                      <span className={cn(task.overdue && !done && "text-destructive")}>
                        {task.overdue && !done
                          ? "Overdue"
                          : `${formatShortDate(task.dueAt, timezone)} · ${formatTime(task.dueAt, timezone)}`}
                      </span>
                    ) : null}
                    {task.projectName ? <span>{task.projectName}</span> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
