import type { WorkspaceEventType } from "@/lib/agents/types";
import type { AutomationSchedule } from "@/lib/automations/schedule";

export type AutomationTemplateId =
  | "morning_brief"
  | "weekly_review"
  | "daily_planning"
  | "habit_review"
  | "project_planning"
  | "goal_checkin";

export type AutomationTemplate = {
  id: AutomationTemplateId;
  name: string;
  description: string;
  triggerType: "SCHEDULE" | "EVENT";
  actionType: string;
  objective: string;
  eventType?: WorkspaceEventType;
  schedule?: Omit<AutomationSchedule, "timeZone">;
};

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "morning_brief",
    name: "Morning Brief",
    description: "A calm snapshot of tasks, calendar, and habits.",
    triggerType: "SCHEDULE",
    actionType: "DAILY_BRIEF",
    objective: "Generate my daily brief",
    schedule: { frequency: "DAILY", time: "08:00" },
  },
  {
    id: "weekly_review",
    name: "Weekly Review",
    description: "Completed work, goals, habits, calendar, and GitHub.",
    triggerType: "SCHEDULE",
    actionType: "WEEKLY_REVIEW",
    objective: "Prepare my weekly review",
    schedule: { frequency: "WEEKLY", time: "08:00", weekday: 0 },
  },
  {
    id: "daily_planning",
    name: "Daily Planning",
    description: "Read the day and propose a realistic schedule.",
    triggerType: "SCHEDULE",
    actionType: "PLAN_DAY",
    objective: "Plan my day",
    schedule: { frequency: "DAILY", time: "08:00" },
  },
  {
    id: "habit_review",
    name: "Habit Review",
    description: "See which habits still need attention.",
    triggerType: "SCHEDULE",
    actionType: "HABIT_REVIEW",
    objective: "Habit review",
    schedule: { frequency: "DAILY", time: "20:00" },
  },
  {
    id: "project_planning",
    name: "Project Planning",
    description: "When you create a project, suggest a planning checklist.",
    triggerType: "EVENT",
    actionType: "PROJECT_CHECKLIST",
    objective: "Suggest a project planning checklist",
    eventType: "PROJECT_CREATED",
  },
  {
    id: "goal_checkin",
    name: "Goal Check-in",
    description: "A weekly look at active goals and related tasks.",
    triggerType: "SCHEDULE",
    actionType: "GOAL_CHECKIN",
    objective: "Goal check-in",
    schedule: { frequency: "WEEKLY", time: "09:00", weekday: 1 },
  },
];

export function templateById(id: string) {
  return AUTOMATION_TEMPLATES.find((item) => item.id === id) ?? null;
}
