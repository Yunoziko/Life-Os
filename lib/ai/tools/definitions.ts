import type { AIToolDefinition } from "@/lib/ai/provider";
import type { AIActionType } from "@/lib/ai/types";

const idOrTitle = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Record id from AZIO context or a previous tool result." },
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
    name: "get_learning",
    description: "Find courses, books, and other learning items by status or search text.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        status: {
          type: "string",
          enum: ["NOT_STARTED", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"],
        },
      },
    },
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
    name: "search_emails",
    description:
      "Search the user's Gmail. Use only when Gmail is connected and the user asked about email. Pass a focused Gmail query (keywords, sender, or Gmail search syntax). Returns sender, subject, date, snippet, and threadId only. Never dump the inbox.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: { query: { type: "string" } },
    },
  },
  {
    name: "get_github_repositories",
    description: "List GitHub repositories the user can access. Use only when GitHub is connected.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
  },
  {
    name: "get_recent_commits",
    description:
      "Recent commits for a GitHub repository (owner/name). If repo is omitted, use a linked AZIO project repo or the most recently pushed repository.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { repo: { type: "string", description: "owner/name" } },
    },
  },
  {
    name: "get_open_issues",
    description: "Open GitHub issues for a repository. Omit pull requests.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { repo: { type: "string", description: "owner/name" } },
    },
  },
  {
    name: "get_pull_requests",
    description: "Open GitHub pull requests for a repository.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { repo: { type: "string", description: "owner/name" } },
    },
  },
  {
    name: "create_task",
    description: "Create one task. AZIO will confirm before saving.",
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
    description: "Create one goal. AZIO will confirm before saving.",
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
    description: "Create one project. AZIO will confirm before saving.",
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
    description: "Schedule one calendar event. AZIO will confirm before saving.",
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
    name: "create_learning_item",
    description: "Add one course, book, or resource to Learning. AZIO will confirm before saving.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        type: {
          type: "string",
          enum: ["COURSE", "BOOK", "ARTICLE", "VIDEO", "PODCAST", "OTHER"],
        },
        url: { type: "string" },
        provider: { type: "string" },
        progress: { type: "integer", minimum: 0, maximum: 100 },
        targetDate: { type: "string", description: "YYYY-MM-DD" },
        goalId: { type: "string" },
        projectId: { type: "string" },
      },
    },
  },
  {
    name: "update_learning_progress",
    description: "Set progress (0–100) on one learning item. 100 marks it complete.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        ...idOrTitle.properties,
        progress: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["progress"],
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
  {
    name: "search_memories",
    description: "Search the user's saved AZIO memories. Returns only relevant, user-controlled facts. Never dump the full memory store.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string", description: "Keywords from the current request, project, or goal." },
      },
      required: ["query"],
    },
  },
  {
    name: "list_memories",
    description: "List saved memories when the user asks what AZIO remembers. Optional filter by query or type.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        type: {
          type: "string",
          enum: [
            "PREFERENCE",
            "GOAL_CONTEXT",
            "PROJECT_CONTEXT",
            "ROUTINE",
            "DECISION",
            "IMPORTANT_CONTEXT",
            "WORKFLOW",
            "PERSONALIZATION",
          ],
        },
      },
    },
  },
  {
    name: "remember_fact",
    description:
      "Propose saving a concise, useful, non-sensitive fact. Do not store raw conversations, inferred personality traits, emails, GitHub text, or calendar descriptions. AZIO will ask the user to confirm unless they already asked to remember it.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        content: { type: "string", description: "A short factual memory in the user's voice, e.g. 'User prefers morning planning.'" },
        type: {
          type: "string",
          enum: [
            "PREFERENCE",
            "GOAL_CONTEXT",
            "PROJECT_CONTEXT",
            "ROUTINE",
            "DECISION",
            "IMPORTANT_CONTEXT",
            "WORKFLOW",
            "PERSONALIZATION",
          ],
        },
        projectId: { type: "string" },
        goalId: { type: "string" },
      },
      required: ["content"],
    },
  },
  {
    name: "update_memory",
    description: "Propose updating an existing saved memory. Requires confirmation.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        content: { type: "string" },
        type: {
          type: "string",
          enum: [
            "PREFERENCE",
            "GOAL_CONTEXT",
            "PROJECT_CONTEXT",
            "ROUTINE",
            "DECISION",
            "IMPORTANT_CONTEXT",
            "WORKFLOW",
            "PERSONALIZATION",
          ],
        },
        importance: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
      },
      required: ["id"],
    },
  },
  {
    name: "forget_memory",
    description: "Propose forgetting a saved memory. Always requires confirmation. Does not delete tasks, projects, or notes.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        query: { type: "string" },
      },
    },
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
  "get_learning",
  "search_notes",
  "get_weekly_summary",
  "search_emails",
  "get_github_repositories",
  "get_recent_commits",
  "get_open_issues",
  "get_pull_requests",
  "search_memories",
  "list_memories",
]);

export const AUTO_WRITE_TOOLS = new Set([
  "complete_task",
  "complete_habit",
  "create_note",
  "update_learning_progress",
]);

export const CONFIRM_WRITE_TOOLS = new Set([
  "create_task",
  "update_task",
  "create_goal",
  "update_goal",
  "create_project",
  "create_calendar_event",
  "create_learning_item",
  "delete_task",
  "delete_goal",
  "delete_project",
  "delete_note",
  "remember_fact",
  "update_memory",
  "forget_memory",
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
  create_learning_item: "CREATE_LEARNING",
  update_learning_progress: "UPDATE_LEARNING_PROGRESS",
  delete_task: "DELETE_TASK",
  delete_goal: "DELETE_GOAL",
  delete_project: "DELETE_PROJECT",
  delete_note: "DELETE_NOTE",
  remember_fact: "REMEMBER_FACT",
  update_memory: "UPDATE_MEMORY",
  forget_memory: "FORGET_MEMORY",
};

export function toolNeedsConfirmation(name: string, writeCount: number) {
  if (READ_TOOLS.has(name)) return false;
  if (writeCount > 1) return true;
  return CONFIRM_WRITE_TOOLS.has(name);
}
