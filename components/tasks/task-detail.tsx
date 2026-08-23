"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeTaskAction, updateTaskAction } from "@/lib/actions/entities";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/tasks/labels";
import { splitDueAt } from "@/lib/utils/due";
import { formatShortDate, formatTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ClientTask } from "@/lib/tasks/serialize";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums";

export function TaskDetail({
  task,
  timezone,
  projects,
  goals,
  variant = "panel",
  lockProject = false,
  onDeleted,
}: {
  task: ClientTask;
  timezone: string;
  projects: AssignableProject[];
  goals: AssignableGoal[];
  variant?: "panel" | "page";
  lockProject?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const done = task.status === "DONE";
  const dueAt = task.dueAt ? new Date(task.dueAt) : null;
  const createdAt = new Date(task.createdAt);
  const updatedAt = new Date(task.updatedAt);
  const split = splitDueAt(dueAt, timezone);

  async function onSave(formData: FormData) {
    formData.set("id", task.id);
    setPending(true);
    const result = await updateTaskAction(formData);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Task updated");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className={cn("flex h-full flex-col", variant === "panel" ? "p-5" : "space-y-6")}>
      <div className="flex items-start gap-3">
        <CompleteControl id={task.id} done={done} kind="task" label={task.title} />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className={cn("text-lg font-medium tracking-tight", done && "text-muted-foreground line-through")}>
            {task.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {TASK_STATUS_LABEL[task.status as TaskStatus]}
            {task.priority !== "NONE"
              ? ` · ${TASK_PRIORITY_LABEL[task.priority as TaskPriority]}`
              : ""}
          </p>
        </div>
      </div>

      {editing ? (
        <form action={onSave} className="mt-6 grid gap-4">
          <TaskFormFields
            values={{
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: task.status,
              dueDate: split.dueDate,
              dueTime: split.dueTime,
              projectId: task.projectId,
              goalId: task.goalId,
            }}
            projects={projects}
            goals={goals}
            includeStatus
            autoFocus
            lockProject={lockProject}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-5 text-sm">
          {task.description ? (
            <p className="leading-6 text-foreground/90">{task.description}</p>
          ) : (
            <p className="text-muted-foreground">No description.</p>
          )}

          <dl className="grid gap-3">
            {dueAt ? (
              <DetailRow
                label="Due"
                value={`${formatShortDate(dueAt, timezone)} · ${formatTime(dueAt, timezone)}`}
              />
            ) : (
              <DetailRow label="Due" value="No due date" />
            )}
            {task.project ? (
              <DetailRow
                label="Project"
                value={
                  <Link href={`/projects/${task.project.id}`} className="hover:underline">
                    {task.project.name}
                  </Link>
                }
              />
            ) : (
              <DetailRow label="Project" value="None" />
            )}
            {task.goal ? (
              <DetailRow
                label="Goal"
                value={
                  <Link href={`/goals/${task.goal.id}`} className="hover:underline">
                    {task.goal.title}
                  </Link>
                }
              />
            ) : (
              <DetailRow label="Goal" value="None" />
            )}
            <DetailRow
              label="Created"
              value={`${formatShortDate(createdAt, timezone)} · ${formatTime(createdAt, timezone)}`}
            />
            <DetailRow
              label="Updated"
              value={`${formatShortDate(updatedAt, timezone)} · ${formatTime(updatedAt, timezone)}`}
            />
          </dl>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                const result = await completeTaskAction(task.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result.data?.done ? "Task completed" : "Task reopened");
                router.refresh();
              }}
            >
              {done ? "Reopen" : "Complete"}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
            {variant === "panel" ? (
              <Link
                href={`/tasks/${task.id}`}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-auto")}
              >
                Open
              </Link>
            ) : null}
          </div>
        </div>
      )}

      <DeleteTaskDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        taskId={task.id}
        title={task.title}
        onDeleted={() => {
          onDeleted?.();
          if (variant === "page") {
            router.push("/tasks");
          }
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
