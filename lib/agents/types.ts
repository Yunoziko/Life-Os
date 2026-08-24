export const MAX_AGENT_STEPS = 10;
export const MAX_AGENT_DURATION_MS = 45_000;
export const MAX_AUTOMATIONS_PER_USER = 20;
export const MAX_AUTOMATION_RUNS_PER_DAY = 50;

export type ToolPermission = "READ" | "WRITE" | "DESTRUCTIVE";
export type FailureClass = "recoverable" | "non_recoverable" | "needs_user_input";
export type AgentRunStatus = "PLANNING" | "EXECUTING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type AgentStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "awaiting_confirmation";

export type AgentPlanStep = {
  tool: string;
  permission: ToolPermission;
  args?: Record<string, unknown>;
  requiresConfirmation?: boolean;
  label?: string;
};

export type AgentPlan = {
  goal: string;
  steps: AgentPlanStep[];
};

export type AgentStepRecord = {
  index: number;
  tool: string;
  permission: ToolPermission;
  args: Record<string, unknown>;
  label: string;
  status: AgentStepStatus;
  requiresConfirmation: boolean;
  summary?: string;
  error?: string;
  failureClass?: FailureClass;
  integrations?: string[];
};

export type AgentProgressEvent =
  | { type: "status"; value: AgentRunStatus }
  | { type: "step"; step: AgentStepRecord }
  | { type: "plan"; plan: AgentPlan }
  | { type: "summary"; text: string };

export type AgentRunResult = {
  runId: string;
  status: AgentRunStatus;
  goal: string;
  plan: AgentPlan;
  steps: AgentStepRecord[];
  summary: string;
  error?: string;
  failureClass?: FailureClass;
  pendingWrites: AgentStepRecord[];
};

export type AgentObjectiveKind =
  | "plan_day"
  | "prepare_tomorrow"
  | "daily_brief"
  | "weekly_review"
  | "habit_review"
  | "goal_checkin"
  | "project_checklist"
  | "project_review"
  | "custom";

export type WorkspaceEventType =
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "PROJECT_CREATED"
  | "GOAL_COMPLETED"
  | "HABIT_COMPLETED";
