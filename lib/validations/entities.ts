import { z } from "zod";

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value : undefined));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give this task a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  dueTime: z.string().optional().or(z.literal("")),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  projectId: emptyToUndefined,
  goalId: emptyToUndefined,
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.string().uuid(),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Give this note a title.").max(160),
  content: z.string().max(20_000).optional().or(z.literal("")),
  projectId: emptyToUndefined,
  goalId: emptyToUndefined,
  tags: z.string().max(200).optional().or(z.literal("")),
});

export const updateNoteSchema = createNoteSchema.extend({
  id: z.string().uuid(),
  pinned: z.enum(["true", "false"]).optional(),
  archived: z.enum(["true", "false"]).optional(),
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Give this goal a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: emptyToUndefined,
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  targetDate: z.string().optional().or(z.literal("")),
  projectId: emptyToUndefined,
  progress: z.coerce.number().int().min(0).max(100).optional(),
});

export const updateGoalSchema = createGoalSchema.extend({
  id: z.string().uuid(),
});

export const updateGoalProgressSchema = z.object({
  id: z.string().uuid(),
  progress: z.coerce.number().int().min(0, "Progress starts at 0.").max(100, "Progress cannot exceed 100."),
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1, "Give this milestone a name.").max(160),
  goalId: z.string().uuid("Choose a goal."),
  dueDate: z.string().optional().or(z.literal("")),
});

export const updateMilestoneSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Give this milestone a name.").max(160).optional(),
  dueDate: z.string().optional().or(z.literal("")),
  completed: z.enum(["true", "false"]).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Give this project a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  color: emptyToUndefined,
  icon: emptyToUndefined,
  startDate: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  goalId: emptyToUndefined,
  githubRepo: z.string().trim().max(120).optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string().uuid(),
});

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Give this habit a name.").max(80),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  target: emptyToUndefined,
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  goalId: emptyToUndefined,
});

export const updateHabitSchema = createHabitSchema.extend({
  id: z.string().uuid(),
  paused: z.enum(["true", "false"]).optional(),
  archived: z.enum(["true", "false"]).optional(),
});

export const habitLogSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().optional(),
  value: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Give this event a name.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  allDay: z.enum(["true", "on", "false"]).optional(),
  location: emptyToUndefined,
  color: emptyToUndefined,
  projectId: emptyToUndefined,
  goalId: emptyToUndefined,
  recurrence: emptyToUndefined,
  reminderMinutes: z.coerce.number().int().min(0).max(10_080).optional(),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
});

export const updateEventSchema = createEventSchema.extend({
  id: z.string().uuid(),
});

export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Type at least two characters.")
    .max(80)
    .refine((value) => !/^[%_*]+$/.test(value), "That search is too broad."),
});

export const createLearningSchema = z.object({
  title: z.string().trim().min(1, "Give this a title.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(["COURSE", "BOOK", "ARTICLE", "VIDEO", "PODCAST", "OTHER"]).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  url: z.string().trim().max(500).optional().or(z.literal("")),
  provider: emptyToUndefined,
  progress: z.coerce.number().int().min(0).max(100).optional(),
  targetDate: z.string().optional().or(z.literal("")),
  projectId: emptyToUndefined,
  goalId: emptyToUndefined,
});

export const updateLearningSchema = createLearningSchema.extend({
  id: z.string().uuid(),
});

export const updateLearningProgressSchema = z.object({
  id: z.string().uuid(),
  progress: z.coerce.number().int().min(0, "Progress starts at 0.").max(100, "Progress cannot exceed 100."),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateLearningInput = z.infer<typeof createLearningSchema>;
export type UpdateLearningInput = z.infer<typeof updateLearningSchema>;
