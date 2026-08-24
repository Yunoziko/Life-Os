"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectAction } from "@/lib/actions/entities";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { ProjectFormFields } from "@/components/projects/project-form-fields";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/workspace-provider";
import { projectAccent, PROJECT_STATUS_LABEL } from "@/lib/projects/labels";
import { ProjectGlyph } from "@/components/projects/project-glyph";
import { calendarDate, formatShortDate } from "@/lib/utils/date";
import { RelatedNotes } from "@/components/notes/related-notes";
import { cn } from "@/lib/utils";
import type { RelatedNoteCard } from "@/components/notes/related-notes";
import type { ClientTask } from "@/lib/tasks/serialize";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { ProjectStatus } from "@/generated/prisma/enums";

export type ProjectWorkspaceData = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  startDate: string | null;
  dueDate: string | null;
  completed: number;
  total: number;
  percent: number;
  goal: { id: string; title: string } | null;
};

export function ProjectWorkspace({
  project,
  tasks,
  notes,
  projects,
  goals,
  timezone,
}: {
  project: ProjectWorkspaceData;
  tasks: ClientTask[];
  notes: RelatedNoteCard[];
  projects: AssignableProject[];
  goals: AssignableGoal[];
  timezone: string;
}) {
  const router = useRouter();
  const { setPageDefaults } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const accent = projectAccent(project.color);
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;
  const startDate = project.startDate ? new Date(project.startDate) : null;

  useEffect(() => {
    setPageDefaults({ projectId: project.id });
    return () => setPageDefaults(null);
  }, [project.id, setPageDefaults]);

  async function onSave(formData: FormData) {
    formData.set("id", project.id);
    setPending(true);
    const result = await updateProjectAction(formData);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Project updated");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card"
            style={{ color: accent }}
          >
            <ProjectGlyph icon={project.icon} className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {PROJECT_STATUS_LABEL[project.status]}
              {dueDate ? ` · Due ${formatShortDate(dueDate, timezone)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projects" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            All projects
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <CreateTrigger type="task" size="sm" defaults={{ projectId: project.id }}>
            New task
          </CreateTrigger>
        </div>
      </header>

      <div className="max-w-md space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{project.percent}%</span>
        </div>
        <ProgressBar value={project.percent} label={`${project.name} progress`} />
        <p className="text-xs text-muted-foreground">
          {project.completed} / {project.total} tasks completed
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-5">
          <section className="max-w-2xl space-y-4 rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {project.description || "No description yet."}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Start</dt>
                <dd>{startDate ? formatShortDate(startDate, timezone) : "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due</dt>
                <dd>{dueDate ? formatShortDate(dueDate, timezone) : "Not set"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Goal</dt>
                <dd>
                  {project.goal ? (
                    <Link href={`/goals/${project.goal.id}`} className="hover:underline">
                      {project.goal.title}
                    </Link>
                  ) : (
                    "None linked"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Active work</dt>
                <dd>
                  {project.total - project.completed} open · {project.completed} done
                </dd>
              </div>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="tasks" className="pt-5">
          <TaskWorkspace
            tasks={tasks}
            projects={projects}
            goals={goals}
            timezone={timezone}
            defaultProjectId={project.id}
          />
        </TabsContent>

        <TabsContent value="notes" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            <RelatedNotes notes={notes} timezone={timezone} />
          </section>
        </TabsContent>

        <TabsContent value="goals" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            {project.goal ? (
              <Link href={`/goals/${project.goal.id}`} className="text-sm hover:underline">
                {project.goal.title}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                This project isn’t linked to a goal yet. Tasks can still belong to a goal on their own.
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="activity" className="pt-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Activity will grow here as you work. For now, use Tasks to see what’s moving.
            </p>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>Update the details for this body of work.</DialogDescription>
          </DialogHeader>
          <form action={onSave} className="grid gap-4">
            <ProjectFormFields
              values={{
                name: project.name,
                description: project.description,
                status: project.status,
                color: project.color,
                icon: project.icon ?? "folder",
                startDate: project.startDate ? calendarDate(timezone, startDate ?? undefined) : "",
                dueDate: project.dueDate ? calendarDate(timezone, dueDate ?? undefined) : "",
              }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
