"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteLearningAction,
  updateLearningAction,
  updateLearningProgressAction,
} from "@/lib/actions/entities";
import { LearningForm, learningValuesToFormData } from "@/components/learning/learning-form";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/components/workspace-provider";
import { hrefForLearningUrl, LEARNING_STATUS_LABEL, LEARNING_TYPE_LABEL } from "@/lib/learning/labels";
import { calendarDate, formatShortDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { LearningStatus, LearningType } from "@/generated/prisma/enums";

export function LearningWorkspace({
  item,
  goals,
  projects,
  timezone,
}: {
  item: {
    id: string;
    title: string;
    description: string | null;
    type: LearningType;
    status: LearningStatus;
    url: string | null;
    provider: string | null;
    progress: number;
    targetDate: string | null;
    goalId: string | null;
    projectId: string | null;
    goal: { id: string; title: string } | null;
    project: { id: string; name: string } | null;
  };
  goals: AssignableGoal[];
  projects: AssignableProject[];
  timezone: string;
}) {
  const router = useRouter();
  const { setPageDefaults } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const targetDate = item.targetDate ? new Date(item.targetDate) : null;

  useEffect(() => {
    setPageDefaults({ goalId: item.goalId ?? undefined, projectId: item.projectId ?? undefined });
    return () => setPageDefaults(null);
  }, [item.goalId, item.projectId, setPageDefaults]);

  async function onSave(values: Parameters<typeof learningValuesToFormData>[0]) {
    setPending(true);
    const result = await updateLearningAction(learningValuesToFormData({ ...values, progress: item.progress }, item.id));
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Updated");
    setEditing(false);
    router.refresh();
  }

  async function onProgress(progress: string) {
    const data = new FormData();
    data.set("id", item.id);
    data.set("progress", progress);
    const result = await updateLearningProgressAction(data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data?.status === "COMPLETED" ? "Marked complete" : "Progress saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <p className="text-sm text-muted-foreground">
            {LEARNING_TYPE_LABEL[item.type]}
            {` · ${LEARNING_STATUS_LABEL[item.status]}`}
            {item.provider ? ` · ${item.provider}` : ""}
            {targetDate ? ` · ${formatShortDate(targetDate, timezone)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/learning" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All learning
          </Link>
          {item.url ? (
            <Link
              href={hrefForLearningUrl(item.url)}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open source
            </Link>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </header>

      <div className="max-w-md space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{item.progress}%</span>
        </div>
        <ProgressBar value={item.progress} label={`${item.title} progress`} />
      </div>

      <section className="max-w-2xl space-y-5 rounded-2xl border border-border/70 bg-card p-5">
        <p className="text-sm leading-6 text-muted-foreground">
          {item.description || "No notes yet."}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Goal</dt>
            <dd>
              {item.goal ? (
                <Link href={`/goals/${item.goal.id}`} className="hover:underline">
                  {item.goal.title}
                </Link>
              ) : (
                "None linked"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Project</dt>
            <dd>
              {item.project ? (
                <Link href={`/projects/${item.project.id}`} className="hover:underline">
                  {item.project.name}
                </Link>
              ) : (
                "None linked"
              )}
            </dd>
          </div>
        </dl>

        <LearningProgressForm
          key={`${item.id}-${item.progress}`}
          initial={item.progress}
          onSave={onProgress}
        />
      </section>

      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
        Delete
      </Button>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit learning</DialogTitle>
            <DialogDescription>Keep the resource, status, and links current.</DialogDescription>
          </DialogHeader>
          <LearningForm
            includeStatus
            values={{
              title: item.title,
              description: item.description ?? "",
              type: item.type,
              status: item.status,
              url: item.url ?? "",
              provider: item.provider ?? "",
              progress: item.progress,
              targetDate: item.targetDate ? calendarDate(timezone, targetDate ?? undefined) : "",
              goalId: item.goalId ?? "",
              projectId: item.projectId ?? "",
            }}
            goals={goals}
            projects={projects}
            pending={pending}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={onSave}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this from Learning?</DialogTitle>
            <DialogDescription>
              {item.title} will be deleted. Linked goals and projects stay in AZIO.
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
                const result = await deleteLearningAction(item.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Removed");
                router.push("/learning");
                router.refresh();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LearningProgressForm({
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
      <Label htmlFor="learning-progress">Update progress</Label>
      <div className="flex items-center gap-3">
        <input
          id="learning-progress"
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
