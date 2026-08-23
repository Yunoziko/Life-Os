"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { createGoalSchema } from "@/lib/validations/entities";
import { GOAL_CATEGORIES, GOAL_PRIORITY_LABEL, GOAL_STATUS_LABEL } from "@/lib/goals/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import type { AssignableProject } from "@/lib/db/tasks";
import { z } from "zod";

const goalFormSchema = createGoalSchema.extend({
  milestones: z.array(z.object({ title: z.string().trim().max(160) })).max(8).optional(),
});

type GoalFormInput = z.input<typeof goalFormSchema>;
export type GoalFormValues = z.output<typeof goalFormSchema>;

export function GoalForm({
  values,
  projects,
  includeStatus = false,
  onSubmit,
  pending,
  submitLabel,
  onCancel,
}: {
  values?: Partial<GoalFormValues>;
  projects: AssignableProject[];
  includeStatus?: boolean;
  onSubmit: (values: GoalFormValues) => Promise<void>;
  pending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const form = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: values?.title ?? "",
      description: values?.description ?? "",
      category: values?.category ?? "",
      priority: values?.priority ?? "MEDIUM",
      status: values?.status ?? "ACTIVE",
      targetDate: values?.targetDate ?? "",
      projectId: values?.projectId ?? "",
      milestones: values?.milestones?.length ? values.milestones : [{ title: "" }],
    },
  });

  const milestones = useFieldArray({ control: form.control, name: "milestones" });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <div className="grid gap-2">
        <Label htmlFor="goal-title">Goal title</Label>
        <Input id="goal-title" autoFocus placeholder="Become a Full Stack Developer" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="goal-description">Description</Label>
        <Textarea
          id="goal-description"
          rows={3}
          placeholder="What does done look like?"
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="goal-category">Category</Label>
          <NativeSelect id="goal-category" {...form.register("category")}>
            <option value="">None</option>
            {GOAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="goal-priority">Priority</Label>
          <NativeSelect id="goal-priority" {...form.register("priority")}>
            {Object.entries(GOAL_PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {includeStatus ? (
          <div className="grid gap-2">
            <Label htmlFor="goal-status">Status</Label>
            <NativeSelect id="goal-status" {...form.register("status")}>
              {Object.entries(GOAL_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="goal-target">Target date</Label>
          <Input id="goal-target" type="date" {...form.register("targetDate")} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="goal-project">Optional project</Label>
        <NativeSelect id="goal-project" {...form.register("projectId")}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {!includeStatus ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Milestones</legend>
          <p className="text-xs text-muted-foreground">Optional. Completing these will drive progress.</p>
          {milestones.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <Input
                aria-label={`Milestone ${index + 1}`}
                placeholder="Learn Next.js"
                {...form.register(`milestones.${index}.title`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove milestone"
                onClick={() => milestones.remove(index)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {milestones.fields.length < 8 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => milestones.append({ title: "" })}>
              <Plus />
              Add milestone
            </Button>
          ) : null}
        </fieldset>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function goalValuesToFormData(values: GoalFormValues, id?: string) {
  const data = new FormData();
  if (id) data.set("id", id);
  data.set("title", values.title);
  data.set("description", values.description ?? "");
  data.set("category", values.category ?? "");
  data.set("priority", values.priority ?? "MEDIUM");
  data.set("status", values.status ?? "ACTIVE");
  data.set("targetDate", values.targetDate ?? "");
  data.set("projectId", values.projectId ?? "");
  for (const milestone of values.milestones ?? []) {
    if (milestone.title.trim()) data.append("milestoneTitle", milestone.title.trim());
  }
  return data;
}
