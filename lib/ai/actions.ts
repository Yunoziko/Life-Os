import type { StructuredAction, AIActionPayload } from "@/lib/ai/types";
import { TOOL_ACTION_TYPE } from "@/lib/ai/tools/definitions";

function str(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

export function payloadFromArgs(args: Record<string, unknown>): AIActionPayload {
  const payload: AIActionPayload = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      payload[key] = value;
    }
  }
  return payload;
}

export function describeAction(tool: string, payload: AIActionPayload) {
  const title =
    str(payload.title) ||
    str(payload.name) ||
    "LifeOS change";

  const due = [str(payload.dueDate) ?? str(payload.date), str(payload.dueTime) ?? str(payload.startTime)]
    .filter(Boolean)
    .join(" ");
  const priority = str(payload.priority);

  const lines = [title];
  if (due) lines.push(due);
  if (priority && priority !== "NONE") {
    lines.push(`${priority.charAt(0)}${priority.slice(1).toLowerCase()} priority`);
  }
  if (payload.targetDate) lines.push(`Target ${payload.targetDate}`);
  if (typeof payload.progress === "number") lines.push(`${payload.progress}% progress`);

  const typeLabel: Record<string, string> = {
    create_task: "Create task",
    update_task: "Update task",
    complete_task: "Complete task",
    create_goal: "Create goal",
    update_goal: "Update goal",
    create_project: "Create project",
    create_calendar_event: "Schedule event",
    create_note: "Create note",
    complete_habit: "Complete habit",
    create_learning_item: "Add learning",
    update_learning_progress: "Update learning progress",
    delete_task: "Delete task",
    delete_goal: "Delete goal",
    delete_project: "Delete project",
    delete_note: "Delete note",
  };

  return {
    heading: typeLabel[tool] ?? "LifeOS wants to make a change",
    title,
    summary: lines.slice(1).join(" · ") || title,
  };
}

export function buildStructuredAction(
  tool: string,
  args: Record<string, unknown>
): StructuredAction | null {
  const type = TOOL_ACTION_TYPE[tool];
  if (!type) return null;
  const payload = payloadFromArgs(args);
  const copy = describeAction(tool, payload);
  return {
    id: crypto.randomUUID(),
    type,
    status: "awaiting_confirmation",
    tool,
    title: copy.heading,
    summary: copy.summary,
    payload,
  };
}
