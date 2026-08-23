"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createEventAction,
  createGoalAction,
  createHabitAction,
  createNoteAction,
  createProjectAction,
  createTaskAction,
} from "@/lib/actions/entities";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
};

export function CreateDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const { createType, closeCreate } = useWorkspace();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    if (!createType) return;
    setPending(true);

    const result =
      createType === "task"
        ? await createTaskAction(formData)
        : createType === "note"
          ? await createNoteAction(formData)
          : createType === "goal"
            ? await createGoalAction(formData)
            : createType === "project"
              ? await createProjectAction(formData)
              : createType === "habit"
                ? await createHabitAction(formData)
                : await createEventAction(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`${copy[createType].title} created`);
    closeCreate();
    router.refresh();
    if (pathname !== "/dashboard") {
      router.push(copy[createType].href);
    }
  }

  return (
    <Dialog open={Boolean(createType)} onOpenChange={(open) => !open && closeCreate()}>
      <DialogContent className="sm:max-w-md">
        {createType ? (
          <>
            <DialogHeader>
              <DialogTitle>{copy[createType].title}</DialogTitle>
              <DialogDescription>{copy[createType].description}</DialogDescription>
            </DialogHeader>
            <form action={onSubmit} className="grid gap-4">
              <CreateFields type={createType} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreate}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateFields({ type }: { type: CreateEntityType }) {
  if (type === "habit") {
    return (
      <>
        <Field id="entity-title" name="name" label="Name" placeholder="Read for 20 minutes" />
        <div className="grid gap-2">
          <Label htmlFor="entity-frequency">Frequency</Label>
          <select
            id="entity-frequency"
            name="frequency"
            defaultValue="DAILY"
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
      </>
    );
  }

  if (type === "event") {
    return (
      <>
        <Field id="entity-title" name="title" label="Title" placeholder="Design review" />
        <Field id="entity-start" name="startAt" label="Starts" type="datetime-local" />
        <Field id="entity-end" name="endAt" label="Ends" type="datetime-local" required={false} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="allDay" className="size-4 rounded border-input" />
          All day
        </label>
      </>
    );
  }

  return (
    <>
      <Field
        id="entity-title"
        name={type === "project" ? "name" : "title"}
        label={type === "project" ? "Name" : "Title"}
        placeholder={
          type === "task"
            ? "Write weekly review"
            : type === "note"
              ? "Ideas for Sunday"
              : type === "goal"
                ? "Ship LifeOS foundation"
                : "Personal systems"
        }
      />

      {type === "task" ? (
        <div className="grid gap-2">
          <Label htmlFor="entity-priority">Priority</Label>
          <select
            id="entity-priority"
            name="priority"
            defaultValue="NONE"
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="NONE">None</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      ) : null}

      {type === "task" || type === "goal" ? (
        <Field
          id="entity-date"
          name={type === "task" ? "dueAt" : "targetDate"}
          label={type === "task" ? "Due date" : "Target date"}
          type="date"
          required={false}
        />
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
      <Input id={id} name={name} type={type} placeholder={placeholder} required={required} autoFocus={id === "entity-title"} />
    </div>
  );
}
