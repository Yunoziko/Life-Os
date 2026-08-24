"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createMilestoneAction,
  deleteGoalAction,
  toggleMilestoneAction,
  updateGoalAction,
  updateGoalProgressAction,
  updateMilestoneAction,
  deleteMilestoneAction,
} from "@/lib/actions/entities";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { CompleteControl } from "@/components/dashboard/complete-control";
import { GoalForm, goalValuesToFormData, type GoalFormValues } from "@/components/goals/goal-form";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/workspace-provider";
import { GOAL_PRIORITY_LABEL, GOAL_STATUS_LABEL } from "@/lib/goals/labels";
import { PROJECT_STATUS_LABEL } from "@/lib/projects/labels";
import { calendarDate, formatRelativeDeadline, formatShortDate } from "@/lib/utils/date";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/tasks/labels";
import { cn } from "@/lib/utils";
import { RelatedNotes } from "@/components/notes/related-notes";
import type { AssignableProject } from "@/lib/db/tasks";
import type { RelatedNoteCard } from "@/components/notes/related-notes";
import type { GoalPriority, GoalStatus, TaskPriority, TaskStatus } from "@/generated/prisma/enums";

type Milestone = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
};

type RelatedTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
};

type RelatedProject = {
  id: string;
  name: string;
  status: string;
};

type RelatedHabit = {
  id: string;
  name: string;
};

export function GoalWorkspace({
  goal,
  projects,
  timezone,
}: {
  goal: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    status: GoalStatus;
    priority: GoalPriority;
    targetDate: string | null;
    progress: number;
    source: "manual" | "milestones" | "tasks";
    createdAt: string;
    updatedAt: string;
    milestones: Milestone[];
    tasks: RelatedTask[];
    projects: RelatedProject[];
    habits: RelatedHabit[];
    notes: RelatedNoteCard[];
  };
  projects: AssignableProject[];
  timezone: string;
}) {
  const router = useRouter();
  const { setPageDefaults } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

  useEffect(() => {
    setPageDefaults({ goalId: goal.id });
    return () => setPageDefaults(null);
  }, [goal.id, setPageDefaults]);

  async function onSave(values: GoalFormValues) {
    setPending(true);
    const result = await updateGoalAction(goalValuesToFormData(values, goal.id));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Goal updated");
    setEditing(false);
    router.refresh();
  }

  async function onProgress(progress: string) {
    const data = new FormData();
    data.set("id", goal.id);
    data.set("progress", progress);
    const result = await updateGoalProgressAction(data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Progress updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
          <p className="text-sm text-muted-foreground">
            {GOAL_STATUS_LABEL[goal.status]}
            {` · ${GOAL_PRIORITY_LABEL[goal.priority]}`}
            {targetDate ? ` · ${formatRelativeDeadline(targetDate, timezone)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/goals" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All goals
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <CreateTrigger type="task" size="sm" defaults={{ goalId: goal.id }}>
            New task
          </CreateTrigger>
        </div>
      </header>

      <div className="max-w-md space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Progress
            {goal.source !== "manual" ? ` · from ${goal.source}` : ""}
          </span>
          <span className="tabular-nums">{goal.progress}%</span>
        </div>
        <ProgressBar value={goal.progress} label={`${goal.title} progress`} className="motion-safe:transition-[width]" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Related Tasks</TabsTrigger>
          <TabsTrigger value="projects">Related Projects</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-5">
          <section className="max-w-2xl space-y-5 rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {goal.description || "No description yet."}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Target</dt>
                <dd>{targetDate ? formatShortDate(targetDate, timezone) : "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{goal.category || "None"}</dd>
              </div>
            </dl>
            {goal.habits.length > 0 ? (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Linked habits</p>
                <ul className="space-y-1">
                  {goal.habits.map((habit) => (
                    <li key={habit.id}>
                      <Link href={`/habits/${habit.id}`} className="text-sm hover:underline">
                        {habit.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {goal.source === "manual" ? (
              <ManualProgressForm
                key={`${goal.id}-${goal.progress}`}
                initial={goal.progress}
                onSave={onProgress}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Progress updates automatically from {goal.source}.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="milestones" className="pt-5">
          <MilestoneList
            goalId={goal.id}
            milestones={goal.milestones}
            timezone={timezone}
          />
        </TabsContent>

        <TabsContent value="tasks" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card">
            {goal.tasks.length === 0 ? (
              <div className="p-5">
                <p className="mb-3 text-sm text-muted-foreground">No tasks are linked yet.</p>
                <CreateTrigger type="task" size="sm" defaults={{ goalId: goal.id }}>
                  Create task
                </CreateTrigger>
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {goal.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <CompleteControl id={task.id} done={task.status === "DONE"} kind="task" label={task.title} />
                    <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {task.title}
                    </Link>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {TASK_PRIORITY_LABEL[task.priority as TaskPriority]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {TASK_STATUS_LABEL[task.status as TaskStatus]}
                    </span>
                    {task.dueAt ? (
                      <span className="hidden text-xs text-muted-foreground md:inline">
                        {formatShortDate(new Date(task.dueAt), timezone)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="projects" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            {goal.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects are linked to this goal yet.</p>
            ) : (
              <ul className="space-y-2">
                {goal.projects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="text-sm hover:underline">
                      {project.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {PROJECT_STATUS_LABEL[project.status as keyof typeof PROJECT_STATUS_LABEL] ??
                        project.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="notes" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            <RelatedNotes notes={goal.notes} timezone={timezone} />
          </section>
        </TabsContent>

        <TabsContent value="activity" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
            Updated {formatShortDate(new Date(goal.updatedAt), timezone)}. Created{" "}
            {formatShortDate(new Date(goal.createdAt), timezone)}.
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Update the outcome you’re working toward.</DialogDescription>
          </DialogHeader>
          <GoalForm
            values={{
              title: goal.title,
              description: goal.description ?? "",
              category: goal.category ?? "",
              priority: goal.priority,
              status: goal.status,
              targetDate: goal.targetDate ? calendarDate(timezone, targetDate ?? undefined) : "",
            }}
            projects={projects}
            includeStatus
            pending={pending}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={onSave}
          />
        </DialogContent>
      </Dialog>

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
          Delete goal
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this goal?</DialogTitle>
            <DialogDescription>
              “{goal.title}” and its milestones will be removed. Related tasks and projects stay.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const result = await deleteGoalAction(goal.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Goal deleted");
                router.push("/goals");
                router.refresh();
              }}
            >
              Delete goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManualProgressForm({
  initial,
  onSave,
}: {
  initial: number;
  onSave: (progress: string) => Promise<void>;
}) {
  const [value, setValue] = useState(String(initial));

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(value);
      }}
      className="grid gap-2"
    >
      <Label htmlFor="goal-progress">Update progress</Label>
      <div className="flex items-center gap-3">
        <input
          id="goal-progress"
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-1.5 w-full accent-foreground"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Number(value)}
        />
        <span className="w-10 text-right text-sm tabular-nums">{value}%</span>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}

function MilestoneList({
  goalId,
  milestones,
  timezone,
}: {
  goalId: string;
  milestones: Milestone[];
  timezone: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const data = new FormData();
    data.set("goalId", goalId);
    data.set("title", title);
    data.set("dueDate", dueDate);
    const result = await createMilestoneAction(data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTitle("");
    setDueDate("");
    toast.success("Milestone added");
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Break the goal into a few clear checkpoints.</p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-start gap-3">
              <button
                type="button"
                aria-label={milestone.completed ? `Reopen ${milestone.title}` : `Complete ${milestone.title}`}
                aria-pressed={milestone.completed}
                onClick={async () => {
                  const result = await toggleMilestoneAction(milestone.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.data?.completed ? "Milestone completed" : "Milestone reopened");
                  router.refresh();
                }}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 motion-reduce:transition-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  milestone.completed
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-transparent hover:border-foreground/40"
                )}
              >
                <span className="text-[10px] leading-none">✓</span>
              </button>
              <div className="min-w-0 flex-1">
                {editingId === milestone.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const data = new FormData();
                      data.set("id", milestone.id);
                      data.set("title", editTitle);
                      const result = await updateMilestoneAction(data);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      setEditingId(null);
                      router.refresh();
                    }}
                  >
                    <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </form>
                ) : (
                  <p className={cn("text-sm", milestone.completed && "text-muted-foreground line-through")}>
                    {milestone.title}
                  </p>
                )}
                {milestone.dueDate ? (
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(new Date(milestone.dueDate), timezone)}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingId(milestone.id);
                  setEditTitle(milestone.title);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const result = await deleteMilestoneAction(milestone.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Milestone deleted");
                  router.refresh();
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a milestone"
          aria-label="Milestone title"
          required
        />
        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="Due date" />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
    </section>
  );
}
