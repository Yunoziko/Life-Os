export type AIRole = "user" | "assistant" | "system" | "tool";

export type ContextSource =
  | "tasks"
  | "goals"
  | "projects"
  | "calendar"
  | "habits"
  | "notes"
  | "learning"
  | "gmail"
  | "github";

export type AIActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "COMPLETE_TASK"
  | "CREATE_GOAL"
  | "UPDATE_GOAL"
  | "CREATE_PROJECT"
  | "CREATE_CALENDAR_EVENT"
  | "CREATE_NOTE"
  | "COMPLETE_HABIT"
  | "CREATE_LEARNING"
  | "UPDATE_LEARNING_PROGRESS"
  | "DELETE_TASK"
  | "DELETE_GOAL"
  | "DELETE_PROJECT"
  | "DELETE_NOTE";

export type AIActionStatus = "awaiting_confirmation" | "executed" | "cancelled" | "failed";

export type AIActionPayload = Record<string, string | number | boolean | null | undefined>;

export type StructuredAction = {
  id: string;
  type: AIActionType;
  status: AIActionStatus;
  tool: string;
  title: string;
  summary: string;
  payload: AIActionPayload;
  result?: string;
};

export type AIMessageMetadata = {
  actions?: StructuredAction[];
  sources?: ContextSource[];
  tools?: { name: string; ok: boolean }[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: AIMessageMetadata | null;
};

export const SUGGESTED_PROMPTS = [
  "Plan my day",
  "What should I focus on?",
  "Review my goals",
  "What am I learning?",
  "Summarize my week",
] as const;

export type ChatStreamEvent =
  | { type: "status"; value: "thinking" }
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; delta: string }
  | { type: "action"; action: StructuredAction }
  | { type: "context"; sources: ContextSource[] }
  | {
      type: "done";
      conversationId: string;
      message: ConversationMessage;
    }
  | { type: "error"; error: string; code?: string };
