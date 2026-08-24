"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createEventAction,
  createGoalAction,
  createHabitAction,
  createMilestoneAction,
  createNoteAction,
  createProjectAction,
  createTaskAction,
  createLearningAction,
} from "@/lib/actions/entities";
import { useWorkspace } from "@/components/workspace-provider";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { ProjectFormFields } from "@/components/projects/project-form-fields";
import { GoalForm, goalValuesToFormData, type GoalFormValues } from "@/components/goals/goal-form";
import { HabitForm, habitValuesToFormData } from "@/components/habits/habit-form";
import { EventForm, eventValuesToFormData, type EventFormValues } from "@/components/calendar/event-form";
import { LearningForm, learningValuesToFormData } from "@/components/learning/learning-form";
import type { CreateHabitInput, CreateLearningInput } from "@/lib/validations/entities";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { isUpgradeResult } from "@/lib/billing/action";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import type { FeatureKey } from "@/lib/billing/config";
import type { CreateEntityType } from "@/types";

const copy: Record<CreateEntityType, { title: string; description: string; href: string }> = {
  task: {
    title: "New task",
    description: "Capture something you want to finish.",
    href: "/tasks",
  },
  note: {
    title: "New note",
    description: "Write it down while it’s still clear.",
    href: "/notes",
  },
  goal: {
    title: "New goal",
    description: "Name the outcome you’re working toward.",
    href: "/goals",
  },
  project: {
    title: "New project",
    description: "Give a body of work a home.",
    href: "/projects",
  },
  habit: {
    title: "New habit",
    description: "A small repeat you want to keep.",
    href: "/habits",
  },
  event: {
    title: "New event",
    description: "Put something on the calendar.",
    href: "/calendar",
  },
  milestone: {
    title: "New milestone",
    description: "A checkpoint on the way to a goal.",
    href: "/goals",
  },
  learning: {
    title: "Add learning",
    description: "A course, book, or resource you want to finish.",
    href: "/learning",
  },
};

function shouldStay(type: CreateEntityType, pathname: string) {
  if (pathname === "/dashboard") return true;
  if (type === "task" && (pathname.startsWith("/tasks") || pathname.startsWith("/projects"))) {
    return true;
  }
  if (type === "project" && pathname.startsWith("/projects")) return true;
  if ((type === "goal" || type === "milestone") && pathname.startsWith("/goals")) return true;
  if (type === "habit" && pathname.startsWith("/habits")) return true;
  if (type === "event" && pathname.startsWith("/calendar")) return true;
  if (type === "learning" && pathname.startsWith("/learning")) return true;
  return false;
}

export function CreateDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const { createType, createDefaults, assignable, closeCreate } = useWorkspace();
  const { openUpgrade } = useUpgrade();
  const [pending, setPending] = useState(false);
  const mobile = useMediaQuery("(max-width: 639px)");

  async function finish(
    type: CreateEntityType,
    result: { ok: true; data?: { id?: string } } | { ok: false; error: string; code?: "upgrade_required"; feature?: string }
  ) {
    setPending(false);
    if (!result.ok) {
      if (isUpgradeResult(result)) {
        openUpgrade(result.feature as FeatureKey);
        return;
      }
      toast.error(result.error);
      return;
    }
    toast.success(`${copy[type].title} created`);
    closeCreate();
    router.refresh();
    if (type === "note" && result.data?.id) {
      router.push(`/notes/${result.data.id}`);
      return;
    }
    if (!shouldStay(type, pathname)) {
      router.push(copy[type].href);
    }
  }

  async function onCreateGoal(values: GoalFormValues) {
    setPending(true);
    const result = await createGoalAction(goalValuesToFormData(values));
    await finish("goal", result);
  }

  async function onCreateHabit(values: CreateHabitInput) {
    setPending(true);
    const result = await createHabitAction(habitValuesToFormData(values));
    await finish("habit", result);
  }

  async function onCreateEvent(values: EventFormValues) {
    setPending(true);
    const result = await createEventAction(eventValuesToFormData(values));
    await finish("event", result);
  }

  async function onCreateLearning(values: CreateLearningInput) {
    setPending(true);
    const result = await createLearningAction(learningValuesToFormData(values));
    await finish("learning", result);
  }

  async function onSubmit(formData: FormData) {
    if (!createType) return;
    setPending(true);

    const result =
      createType === "task"
        ? await createTaskAction(formData)
        : createType === "note"
          ? await createNoteAction(formData)
          : createType === "project"
            ? await createProjectAction(formData)
            : createType === "milestone"
              ? await createMilestoneAction(formData)
              : await createEventAction(formData);

    await finish(createType, result);
  }

  const form =
    createType === "goal" ? (
      <GoalForm
        values={{ projectId: createDefaults.projectId }}
        projects={assignable.projects}
        pending={pending}
        submitLabel="Create"
        onCancel={closeCreate}
        onSubmit={onCreateGoal}
      />
    ) : createType === "habit" ? (
      <HabitForm
        values={{ goalId: createDefaults.goalId }}
        goals={assignable.goals}
        pending={pending}
        submitLabel="Create"
        onCancel={closeCreate}
        onSubmit={onCreateHabit}
      />
    ) : createType === "event" ? (
      <EventForm
        values={{
          date: createDefaults.date,
          startTime: createDefaults.startTime,
          projectId: createDefaults.projectId,
          goalId: createDefaults.goalId,
        }}
        projects={assignable.projects}
        goals={assignable.goals}
        pending={pending}
        submitLabel="Create"
        onCancel={closeCreate}
        onSubmit={onCreateEvent}
      />
    ) : createType === "learning" ? (
      <LearningForm
        values={{
          goalId: createDefaults.goalId,
          projectId: createDefaults.projectId,
        }}
        goals={assignable.goals}
        projects={assignable.projects}
        pending={pending}
        submitLabel="Add"
        onCancel={closeCreate}
        onSubmit={onCreateLearning}
      />
    ) : createType ? (
      <form action={onSubmit} className="grid gap-4">
        <CreateFields
          type={createType}
          defaults={createDefaults}
          projects={assignable.projects}
          goals={assignable.goals}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeCreate}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    ) : null;

  if (mobile) {
    return (
      <Sheet open={Boolean(createType)} onOpenChange={(open) => !open && closeCreate()}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] max-h-[100dvh] overflow-y-auto rounded-none border-0 p-4 motion-reduce:transition-none"
        >
          {createType ? (
            <>
              <SheetHeader className="px-0">
                <SheetTitle>{copy[createType].title}</SheetTitle>
                <SheetDescription>{copy[createType].description}</SheetDescription>
              </SheetHeader>
              {form}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={Boolean(createType)} onOpenChange={(open) => !open && closeCreate()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {createType ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy[createType].title}</DialogTitle>
              <DialogDescription>{copy[createType].description}</DialogDescription>
            </DialogHeader>
            {form}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateFields({
  type,
  defaults,
  projects,
  goals,
}: {
  type: CreateEntityType;
  defaults: { projectId?: string; goalId?: string };
  projects: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}) {
  if (type === "milestone") {
    return (
      <>
        <Field id="entity-title" name="title" label="Title" placeholder="Learn Next.js" />
        <div className="grid gap-2">
          <Label htmlFor="milestone-goal">Goal</Label>
          <NativeSelect id="milestone-goal" name="goalId" defaultValue={defaults.goalId ?? ""} required>
            <option value="">Choose a goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Field id="milestone-due" name="dueDate" label="Due date" type="date" required={false} />
      </>
    );
  }

  if (type === "task") {
    return (
      <TaskFormFields
        values={{
          projectId: defaults.projectId,
          goalId: defaults.goalId,
        }}
        projects={projects}
        goals={goals}
        lockProject={Boolean(defaults.projectId)}
        lockGoal={Boolean(defaults.goalId)}
      />
    );
  }

  if (type === "project") {
    return <ProjectFormFields />;
  }

  return (
    <>
      <Field
        id="entity-title"
        name="title"
        label="Title"
        placeholder={type === "note" ? "Ideas for Sunday" : "Ship LifeOS foundation"}
      />

      {type === "note" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="note-project">Project</Label>
              <NativeSelect id="note-project" name="projectId" defaultValue={defaults.projectId ?? ""}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-goal">Goal</Label>
              <NativeSelect id="note-goal" name="goalId" defaultValue={defaults.goalId ?? ""}>
                <option value="">No goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <Field id="note-tags" name="tags" label="Tags" placeholder="ideas, launch" required={false} />
        </>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="entity-body">{type === "note" ? "Content" : "Notes"}</Label>
        <Textarea
          id="entity-body"
          name={type === "note" ? "content" : "description"}
          rows={4}
          placeholder="Optional context"
        />
      </div>
    </>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  type = "text",
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoFocus={id === "entity-title"}
      />
    </div>
  );
}
