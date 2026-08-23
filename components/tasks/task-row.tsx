"use client";

import { CompleteControl } from "@/components/dashboard/complete-control";
import { TASK_PRIORITY_LABEL } from "@/lib/tasks/labels";
import { calendarDaysUntil, formatRelativeDeadline, formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ClientTask } from "@/lib/tasks/serialize";
import type { TaskPriority } from "@/generated/prisma/enums";

const priorityRail: Record<TaskPriority, string> = {
  NONE: "bg-transparent",
  LOW: "bg-foreground/15",
  MEDIUM: "bg-foreground/30",
  HIGH: "bg-foreground/55",
  URGENT: "bg-foreground",
};

export function TaskRow({
  task,
  timezone,
  selected,
  onSelect,
}: {
  task: ClientTask;
  timezone: string;
  selected?: boolean;
  onSelect: (task: ClientTask) => void;
}) {
  const done = task.status === "DONE";
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = Boolean(dueAt && calendarDaysUntil(dueAt, timezone) < 0 && !done);
  const priority = task.priority as TaskPriority;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(task)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(task);
          }
        }}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50",
          selected && "bg-muted/70"
        )}
      >
        <span
          aria-hidden
          className={cn("mt-1.5 h-4 w-0.5 shrink-0 rounded-full", priorityRail[priority])}
        />
        <CompleteControl id={task.id} done={done} kind="task" label={task.title} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm",
              done ? "text-muted-foreground line-through" : "text-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {priority !== "NONE" ? (
              <span className={cn((priority === "HIGH" || priority === "URGENT") && "text-foreground/80")}>
                {TASK_PRIORITY_LABEL[priority]}
              </span>
            ) : null}
            {dueAt ? (
              <span className={cn(overdue && "text-destructive")}>
                {overdue ? formatRelativeDeadline(dueAt, timezone) : formatShortDate(dueAt, timezone)}
              </span>
            ) : null}
            {task.project ? <span>{task.project.name}</span> : null}
          </div>
        </div>
      </div>
    </li>
  );
}
