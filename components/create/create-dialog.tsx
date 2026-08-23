"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createGoalAction,
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

const copy: Record<
  CreateEntityType,
  { title: string; description: string; href: string }
> = {
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
};

export function CreateDialog() {
  const router = useRouter();
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
            : await createProjectAction(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`${copy[createType].title} created`);
    closeCreate();
    router.push(copy[createType].href);
    router.refresh();
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
              <div className="grid gap-2">
                <Label htmlFor="entity-title">{createType === "project" ? "Name" : "Title"}</Label>
                <Input
                  id="entity-title"
                  name={createType === "project" ? "name" : "title"}
                  placeholder={
                    createType === "task"
                      ? "Write weekly review"
                      : createType === "note"
                        ? "Ideas for Sunday"
                        : createType === "goal"
                          ? "Ship LifeOS foundation"
                          : "Personal systems"
                  }
                  autoFocus
                  required
                />
              </div>

              {createType === "task" || createType === "goal" ? (
                <div className="grid gap-2">
                  <Label htmlFor="entity-date">
                    {createType === "task" ? "Due date" : "Target date"}
                  </Label>
                  <Input
                    id="entity-date"
                    name={createType === "task" ? "dueAt" : "targetDate"}
                    type="date"
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="entity-body">
                  {createType === "note" ? "Content" : "Notes"}
                </Label>
                <Textarea
                  id="entity-body"
                  name={createType === "note" ? "content" : "description"}
                  rows={4}
                  placeholder="Optional context"
                />
              </div>

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
