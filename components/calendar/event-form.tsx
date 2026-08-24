"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createEventSchema } from "@/lib/validations/entities";
import { EVENT_COLORS, RECURRENCE_OPTIONS, REMINDER_OPTIONS } from "@/lib/calendar/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import type { AssignableGoal, AssignableProject } from "@/lib/db/tasks";

const eventFormSchema = createEventSchema;

type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

export function EventForm({
  values,
  projects,
  goals,
  pending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  values?: Partial<EventFormValues>;
  projects: AssignableProject[];
  goals: AssignableGoal[];
  pending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
}) {
  const form = useForm<EventFormInput, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: values?.title ?? "",
      description: values?.description ?? "",
      date: values?.date || new Date().toISOString().slice(0, 10),
      startTime: values?.startTime ?? "09:00",
      endTime: values?.endTime ?? "10:00",
      allDay: values?.allDay ?? undefined,
      location: values?.location ?? "",
      color: values?.color ?? "stone",
      projectId: values?.projectId ?? "",
      goalId: values?.goalId ?? "",
      recurrence: values?.recurrence ?? "",
      reminderMinutes: values?.reminderMinutes,
    },
  });

  const [allDay, setAllDay] = useState(
    values?.allDay === "true" || values?.allDay === "on"
  );

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(data);
      })}
    >
      <div className="grid gap-2">
        <Label htmlFor="event-title">Title</Label>
        <Input id="event-title" autoFocus placeholder="DSA Practice" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="event-description">Description</Label>
        <Textarea id="event-description" rows={3} placeholder="Optional context" {...form.register("description")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="event-date">Date</Label>
          <Input id="event-date" type="date" {...form.register("date")} />
        </div>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={allDay}
            onChange={(event) => {
              const checked = event.target.checked;
              setAllDay(checked);
              form.setValue("allDay", checked ? "true" : undefined);
            }}
          />
          All day
        </label>
      </div>

      {allDay ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="event-start">Start time</Label>
            <Input id="event-start" type="time" {...form.register("startTime")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-end">End time</Label>
            <Input id="event-end" type="time" {...form.register("endTime")} />
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="event-location">Location</Label>
        <Input id="event-location" placeholder="Optional" {...form.register("location")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="event-project">Project</Label>
          <NativeSelect id="event-project" {...form.register("projectId")}>
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="event-goal">Goal</Label>
          <NativeSelect id="event-goal" {...form.register("goalId")}>
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="event-reminder">Reminder</Label>
          <NativeSelect
            id="event-reminder"
            {...form.register("reminderMinutes", { setValueAs: (value) => (value ? Number(value) : undefined) })}
          >
            {REMINDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="event-repeat">Repeat</Label>
          <NativeSelect id="event-repeat" {...form.register("recurrence")}>
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {EVENT_COLORS.map((color) => (
            <label key={color.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="radio" value={color.id} {...form.register("color")} className="sr-only" />
              <span
                className="size-5 rounded-full border border-border"
                style={{ background: color.value }}
                aria-hidden
              />
              <span className="sr-only">{color.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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

export function eventValuesToFormData(values: EventFormValues, id?: string) {
  const data = new FormData();
  if (id) data.set("id", id);
  data.set("title", values.title);
  data.set("description", values.description ?? "");
  data.set("date", values.date ?? "");
  data.set("startTime", values.startTime ?? "");
  data.set("endTime", values.endTime ?? "");
  if (values.allDay === "true" || values.allDay === "on") data.set("allDay", "true");
  data.set("location", values.location ?? "");
  data.set("color", values.color ?? "");
  data.set("projectId", values.projectId ?? "");
  data.set("goalId", values.goalId ?? "");
  data.set("recurrence", values.recurrence ?? "");
  if (values.reminderMinutes != null) data.set("reminderMinutes", String(values.reminderMinutes));
  return data;
}
