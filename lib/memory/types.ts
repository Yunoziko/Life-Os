export const MAX_RELEVANT_MEMORIES = 10;
export const MAX_MEMORY_CANDIDATES = 40;
export const FREE_MEMORY_LIMIT = 25;
export const DEDUPE_THRESHOLD = 0.62;
export const CONTRADICTION_OVERLAP = 0.28;

export const MEMORY_TYPES = [
  "PREFERENCE",
  "GOAL_CONTEXT",
  "PROJECT_CONTEXT",
  "ROUTINE",
  "DECISION",
  "IMPORTANT_CONTEXT",
  "WORKFLOW",
  "PERSONALIZATION",
] as const;

export type MemoryTypeId = (typeof MEMORY_TYPES)[number];
export type MemoryStatusId = "ACTIVE" | "ARCHIVED" | "DELETED";
export type MemorySourceId = "USER" | "AI" | "NOTE" | "TASK" | "PROJECT" | "CONVERSATION";
export type MemoryImportanceId = "HIGH" | "MEDIUM" | "LOW";
export type MemoryConfidenceId = "HIGH" | "MEDIUM" | "LOW";

export type MemoryRecord = {
  id: string;
  userId: string;
  type: MemoryTypeId;
  content: string;
  source: MemorySourceId;
  importance: MemoryImportanceId;
  confidence: MemoryConfidenceId;
  status: MemoryStatusId;
  projectId: string | null;
  goalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
};

export type MemoryWriteInput = {
  type?: MemoryTypeId;
  content: string;
  source?: MemorySourceId;
  importance?: MemoryImportanceId;
  confidence?: MemoryConfidenceId;
  projectId?: string | null;
  goalId?: string | null;
};

export type MemoryRetrievalContext = {
  userId: string;
  query: string;
  projectId?: string | null;
  goalId?: string | null;
  projectName?: string | null;
  goalTitle?: string | null;
};

export const MEMORY_TYPE_LABEL: Record<MemoryTypeId, string> = {
  PREFERENCE: "Preference",
  GOAL_CONTEXT: "Goal",
  PROJECT_CONTEXT: "Project",
  ROUTINE: "Routine",
  DECISION: "Decision",
  IMPORTANT_CONTEXT: "Important",
  WORKFLOW: "Workflow",
  PERSONALIZATION: "Personalization",
};

export function memoryOwnerFilter(userId: string) {
  return { userId };
}
