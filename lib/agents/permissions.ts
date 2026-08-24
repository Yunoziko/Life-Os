import type { ToolPermission } from "@/lib/agents/types";

const READ_TOOLS = new Set([
  "get_today_tasks",
  "get_tasks",
  "get_today_schedule",
  "get_upcoming_events",
  "get_calendar",
  "get_active_goals",
  "get_goals",
  "get_active_projects",
  "get_projects",
  "get_today_habits",
  "get_habits",
  "get_learning",
  "search_notes",
  "get_weekly_summary",
  "search_gmail",
  "search_emails",
  "get_github_activity",
  "get_github_repositories",
  "get_recent_commits",
  "get_open_issues",
  "get_pull_requests",
  "search_memories",
  "list_memories",
]);

const WRITE_TOOLS = new Set([
  "create_task",
  "update_task",
  "complete_task",
  "create_goal",
  "update_goal",
  "create_project",
  "create_calendar_event",
  "create_note",
  "complete_habit",
  "create_learning_item",
  "update_learning_progress",
  "remember_fact",
  "update_memory",
]);

const DESTRUCTIVE_TOOLS = new Set([
  "delete_task",
  "delete_goal",
  "delete_project",
  "delete_note",
  "forget_memory",
]);

const SAFE_SINGLE_WRITES = new Set(["create_task", "complete_task", "create_note", "complete_habit"]);

const EXTERNAL_SIDE_EFFECTS = new Set(["create_calendar_event", "search_gmail", "search_emails"]);

const ALIASES: Record<string, string> = {
  get_calendar: "get_upcoming_events",
  search_gmail: "search_emails",
  get_github_activity: "get_recent_commits",
};

export function resolveToolName(name: string) {
  return ALIASES[name] ?? name;
}

export function toolPermission(name: string): ToolPermission | null {
  const resolved = resolveToolName(name);
  if (READ_TOOLS.has(name) || READ_TOOLS.has(resolved)) return "READ";
  if (WRITE_TOOLS.has(name) || WRITE_TOOLS.has(resolved)) return "WRITE";
  if (DESTRUCTIVE_TOOLS.has(name) || DESTRUCTIVE_TOOLS.has(resolved)) return "DESTRUCTIVE";
  return null;
}

export function isForbiddenTool(name: string) {
  const lower = name.toLowerCase();
  return ["sql", "shell", "eval", "javascript", "billing", "subscription", "auth", "password", "secret"].some(
    (item) => lower.includes(item)
  );
}

export function isRegisteredTool(name: string) {
  return toolPermission(name) !== null && !isForbiddenTool(name);
}

export function isDestructiveTool(name: string) {
  return toolPermission(name) === "DESTRUCTIVE";
}

export function hasExternalSideEffect(name: string) {
  const resolved = resolveToolName(name);
  return EXTERNAL_SIDE_EFFECTS.has(name) || EXTERNAL_SIDE_EFFECTS.has(resolved);
}

export function stepRequiresConfirmation(input: {
  tool: string;
  writeCount: number;
  autoConfirm?: boolean;
}) {
  const permission = toolPermission(input.tool);
  if (!permission) return true;
  if (permission === "READ") return false;
  if (permission === "DESTRUCTIVE") return true;
  if (input.autoConfirm && permission === "WRITE") return false;
  if (hasExternalSideEffect(input.tool)) return true;
  if (input.writeCount > 1) return true;
  return !SAFE_SINGLE_WRITES.has(resolveToolName(input.tool));
}

export function classifyFailure(error: string): "recoverable" | "non_recoverable" | "needs_user_input" {
  const text = error.toLowerCase();
  if (text.includes("google") || text.includes("gmail") || text.includes("github") || text.includes("calendar")) {
    return "recoverable";
  }
  if (text.includes("confirm") || text.includes("sign in") || text.includes("connect")) {
    return "needs_user_input";
  }
  if (text.includes("unknown tool") || text.includes("not allowed") || text.includes("permission")) {
    return "non_recoverable";
  }
  return "recoverable";
}

export function publicStepLabel(tool: string) {
  const labels: Record<string, string> = {
    get_today_tasks: "Reading today's tasks",
    get_tasks: "Reading tasks",
    get_today_schedule: "Checking today's calendar",
    get_upcoming_events: "Checking calendar",
    get_calendar: "Checking calendar",
    get_active_goals: "Reviewing goals",
    get_goals: "Reviewing goals",
    get_active_projects: "Reviewing projects",
    get_projects: "Reviewing projects",
    get_today_habits: "Checking habits",
    get_habits: "Checking habits",
    get_learning: "Reviewing learning",
    search_notes: "Searching notes",
    get_weekly_summary: "Summarizing the week",
    search_gmail: "Searching Gmail",
    search_emails: "Searching Gmail",
    get_github_activity: "Reviewing GitHub",
    get_github_repositories: "Listing GitHub repositories",
    get_recent_commits: "Reviewing GitHub",
    get_open_issues: "Reviewing GitHub issues",
    get_pull_requests: "Reviewing pull requests",
    create_task: "Creating a task",
    update_task: "Updating a task",
    complete_task: "Completing a task",
    create_goal: "Creating a goal",
    update_goal: "Updating a goal",
    create_project: "Creating a project",
    create_calendar_event: "Updating calendar",
    create_note: "Saving a note",
    complete_habit: "Completing a habit",
    create_learning_item: "Adding learning",
    update_learning_progress: "Updating learning",
    delete_task: "Deleting a task",
    delete_goal: "Deleting a goal",
    delete_project: "Deleting a project",
    delete_note: "Deleting a note",
    search_memories: "Checking saved memories",
    list_memories: "Listing saved memories",
    remember_fact: "Saving a memory",
    update_memory: "Updating a memory",
    forget_memory: "Forgetting a memory",
  };
  return labels[tool] ?? "Working";
}
