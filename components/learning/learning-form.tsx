"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLearningSchema } from "@/lib/validations/entities";
import { LEARNING_STATUS_LABEL, LEARNING_TYPE_LABEL } from "@/lib/learning/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";
import type { CreateLearningInput } from "@/lib/validations/entities";
import { z } from "zod";

type LearningFormInput = z.input<typeof createLearningSchema>;

export function LearningForm({
  values,
  goals,
  projects,
  includeStatus = false,
  onSubmit,
  pending,
  submitLabel,
  onCancel,
}: {
  values?: Partial<CreateLearningInput>;
  goals: AssignableGoal[];
  projects: AssignableProject[];
  includeStatus?: boolean;
  onSubmit: (values: CreateLearningInput) => Promise<void>;
  pending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const form = useForm<LearningFormInput, unknown, CreateLearningInput>({
    resolver: zodResolver(createLearningSchema),
    defaultValues: {
      title: values?.title ?? "",
      description: values?.description ?? "",
      type: values?.type ?? "COURSE",
      status: values?.status ?? "NOT_STARTED",
      url: values?.url ?? "",
      provider: values?.provider ?? "",
      progress: values?.progress ?? 0,
      targetDate: values?.targetDate ?? "",
      goalId: values?.goalId ?? "",
      projectId: values?.projectId ?? "",
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="learning-title">Title</Label>
        <Input
          id="learning-title"
          autoFocus
          placeholder="Full Stack Open"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="learning-description">Why it matters</Label>
        <Textarea
          id="learning-description"
          rows={3}
          placeholder="What you want to take from this"
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="learning-type">Type</Label>
          <NativeSelect id="learning-type" {...form.register("type")}>
            {Object.entries(LEARNING_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {includeStatus ? (
          <div className="grid gap-2">
            <Label htmlFor="learning-status">Status</Label>
            <NativeSelect id="learning-status" {...form.register("status")}>
              {Object.entries(LEARNING_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="learning-provider">Source</Label>
            <Input id="learning-provider" placeholder="Coursera, YouTube, O’Reilly" {...form.register("provider")} />
          </div>
        )}
      </div>

      {includeStatus ? (
        <div className="grid gap-2">
          <Label htmlFor="learning-provider">Source</Label>
          <Input id="learning-provider" placeholder="Coursera, YouTube, O’Reilly" {...form.register("provider")} />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="learning-url">Link</Label>
        <Input id="learning-url" placeholder="https://" {...form.register("url")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="learning-goal">Goal</Label>
          <NativeSelect id="learning-goal" {...form.register("goalId")}>
            <option value="">None</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="learning-project">Project</Label>
          <NativeSelect id="learning-project" {...form.register("projectId")}>
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="learning-target">Target date</Label>
        <Input id="learning-target" type="date" {...form.register("targetDate")} />
      </div>

      <div className="flex justify-end gap-2">
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

export function learningValuesToFormData(values: CreateLearningInput, id?: string) {
  const data = new FormData();
  if (id) data.set("id", id);
  data.set("title", values.title);
  data.set("description", values.description ?? "");
  data.set("type", values.type ?? "COURSE");
  data.set("status", values.status ?? "NOT_STARTED");
  data.set("url", values.url ?? "");
  data.set("provider", values.provider ?? "");
  data.set("progress", String(values.progress ?? 0));
  data.set("targetDate", values.targetDate ?? "");
  data.set("goalId", values.goalId ?? "");
  data.set("projectId", values.projectId ?? "");
  return data;
}
