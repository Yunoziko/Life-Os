"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createHabitSchema } from "@/lib/validations/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import type { AssignableGoal } from "@/lib/db/tasks";
import type { CreateHabitInput } from "@/lib/validations/entities";
import { z } from "zod";

type HabitFormInput = z.input<typeof createHabitSchema>;

export function HabitForm({
  values,
  goals,
  onSubmit,
  pending,
  submitLabel,
  onCancel,
}: {
  values?: Partial<CreateHabitInput>;
  goals: AssignableGoal[];
  onSubmit: (values: CreateHabitInput) => Promise<void>;
  pending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const form = useForm<HabitFormInput, unknown, CreateHabitInput>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      name: values?.name ?? "",
      description: values?.description ?? "",
      frequency: values?.frequency ?? "DAILY",
      target: values?.target ?? "",
      startDate: values?.startDate ?? "",
      goalId: values?.goalId ?? "",
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor="habit-name">Name</Label>
        <Input id="habit-name" autoFocus placeholder="DSA Practice" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="habit-description">Description</Label>
        <Textarea
          id="habit-description"
          rows={3}
          placeholder="What this repeat is for"
          {...form.register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="habit-frequency">Frequency</Label>
          <NativeSelect id="habit-frequency" {...form.register("frequency")}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="habit-target">Target</Label>
          <Input id="habit-target" placeholder="60 minutes" {...form.register("target")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="habit-start">Start date</Label>
          <Input id="habit-start" type="date" {...form.register("startDate")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="habit-goal">Optional goal</Label>
          <NativeSelect id="habit-goal" {...form.register("goalId")}>
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

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

export function habitValuesToFormData(values: CreateHabitInput, id?: string) {
  const data = new FormData();
  if (id) data.set("id", id);
  data.set("name", values.name);
  data.set("description", values.description ?? "");
  data.set("frequency", values.frequency);
  data.set("target", values.target ?? "");
  data.set("startDate", values.startDate ?? "");
  data.set("goalId", values.goalId ?? "");
  return data;
}
