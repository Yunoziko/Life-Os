import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give this task a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Give this note a title.").max(160),
  content: z.string().max(20_000).optional().or(z.literal("")),
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Give this goal a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  targetDate: z.string().optional().or(z.literal("")),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Give this project a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Give this habit a name.").max(80),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Give this event a name.").max(160),
  startAt: z.string().min(1, "Choose a start time."),
  endAt: z.string().optional().or(z.literal("")),
  allDay: z.literal("on").optional(),
});

export const searchSchema = z.object({
  query: z.string().trim().min(1).max(120),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
