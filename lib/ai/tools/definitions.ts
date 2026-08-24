import type { AIToolDefinition } from "@/lib/ai/provider";
import type { AIActionType } from "@/lib/ai/types";

const idOrTitle = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Record id from LifeOS context or a previous tool result." },
    title: { type: "string", description: "Exact or close title if id is unknown." },
  },
};

export const lifeOSTools: AIToolDefinition[] = [
  {
    name: "get_today_tasks",
    description: "List today's open, overdue, and completed tasks.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_tasks",
    description: "Find tasks by status or search text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] },
      },
    },
  },
  {
    name: "get_today_schedule",
    description: "Today's calendar events plus timed tasks.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_upcoming_events",
    description: "Calendar events for the next 7 days.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_active_goals",
    description: "Active and not-started goals with progress.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_goals",
    description: "Find goals by title or status.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        status: {
          type: "string",
          enum: ["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
        },
      },
    },
  },
  {
    name: "get_active_projects",
    description: "Active and planned projects.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_projects",
    description: "Find projects by name or status.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        status: {
          type: "string",
          enum: ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"],
        },
      },
    },
  },
  {
    name: "get_today_habits",
    description: "Today's habits and whether each is complete.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_habits",
    description: "List the user's active habits.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "search_notes",
    description: "Search notes by title or preview. Returns titles and short previews only.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: { query: { type: "string" } },
    },
  },
  {
    name: "get_weekly_summary",
    description: "Counts and highlights for the last 7 days.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "create_task",
    description: "Create one task. LifeOS will confirm before saving.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string", description: "YYYY-MM-DD in the user's timezone." },
        dueTime: { type: "string", description: "HH:mm 24h in the user's timezone." },
        priority: { type: "string", enum: ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] },
        projectId: { type: "string" },
        goalId: { type: "string" },
      },
    },
  },
  {
    name: "update_task",
    description: "Update a task. Date changes require confirmation.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...idOrTitle.properties,
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        dueTime: { type: "string" },
        priority: { type: "string", enum: ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] },
        status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] },
      },
    },
  },
  {
    name: "complete_task",
    description: "Mark one task complete.",
    parameters: { type: "object", additionalProperties: false, properties: idOrTitle.properties },
  },
  {
    name: "create_goal",
    description: "Create one goal. LifeOS will confirm before saving.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        targetDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
  },
  {
    name: "update_goal",
    description: "Update a goal. Target date changes require confirmation.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...idOrTitle.properties,
        title: { type: "string" },
        description: { type: "string" },
        progress: { type: "integer", minimum: 0, maximum: 100 },
        status: {
          type: "string",
          enum: ["NOT_STARTED", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
        },
        targetDate: { type: "string" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      },
    },
  },
  {
    name: "create_project",
    description: "Create one project. LifeOS will confirm before saving.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
      },
    },
  },
  {
    name: "create_calendar_event",
    description: "Schedule one calendar event. LifeOS will confirm before saving.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["title", "date"],
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        startTime: { type: "string", description: "HH:mm" },
        endTime: { type: "string", description: "HH:mm" },
        allDay: { type: "boolean" },
        description: { type: "string" },
        location: { type: "string" },
      },
    },
  },
  {
    name: "create_note",
    description: "Create one note.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        content: { type: "string" },
      },
    },
  },
  {
    name: "complete_habit",
    description: "Mark one habit complete for today.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    name: "delete_task",
    description: "Propose deleting a task. Always requires confirmation.",
    parameters: { type: "object", additionalProperties: false, properties: idOrTitle.properties },
  },
  {
    name: "delete_goal",
    description: "Propose deleting a goal. Always requires confirmation.",
    parameters: { type: "object", additionalProperties: false, properties: idOrTitle.properties },
  },
  {
    name: "delete_project",
    description: "Propose deleting a project. Always requires confirmation.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    name: "delete_note",
    description: "Propose deleting a note. Always requires confirmation.",
    parameters: { type: "object", additionalProperties: false, properties: idOrTitle.properties },
  },
];

export const READ_TOOLS = new Set([
  "get_today_tasks",
  "get_tasks",
  "get_today_schedule",
  "get_upcoming_events",
  "get_active_goals",
  "get_goals",
  "get_active_projects",
  "get_projects",
  "get_today_habits",
  "get_habits",
  "search_notes",
  "get_weekly_summary",
]);

export const AUTO_WRITE_TOOLS = new Set(["complete_task", "complete_habit", "create_note"]);

export const CONFIRM_WRITE_TOOLS = new Set([
  "create_task",
  "update_task",
  "create_goal",
  "update_goal",
  "create_project",
  "create_calendar_event",
  "delete_task",
  "delete_goal",
  "delete_project",
  "delete_note",
]);

export const TOOL_ACTION_TYPE: Record<string, AIActionType> = {
  create_task: "CREATE_TASK",
  update_task: "UPDATE_TASK",
  complete_task: "COMPLETE_TASK",
  create_goal: "CREATE_GOAL",
  update_goal: "UPDATE_GOAL",
  create_project: "CREATE_PROJECT",
  create_calendar_event: "CREATE_CALENDAR_EVENT",
  create_note: "CREATE_NOTE",
  complete_habit: "COMPLETE_HABIT",
  delete_task: "DELETE_TASK",
  delete_goal: "DELETE_GOAL",
  delete_project: "DELETE_PROJECT",
  delete_note: "DELETE_NOTE",
};

export function toolNeedsConfirmation(name: string, writeCount: number) {
  if (READ_TOOLS.has(name)) return false;
  if (writeCount > 1) return true;
  return CONFIRM_WRITE_TOOLS.has(name);
}
