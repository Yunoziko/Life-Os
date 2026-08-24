import { getAIProvider, isAIConfigured } from "@/lib/ai";
import { assertAIRateLimit } from "@/lib/ai/rate-limit";
import { assertAIUsage } from "@/lib/billing/entitlements";
import { recordAIUsage } from "@/lib/billing/usage";
import { executeRegisteredTool } from "@/lib/agents/registry";
import { recordAgentAudit } from "@/lib/agents/audit";
import { classifyFailure, publicStepLabel, resolveToolName } from "@/lib/agents/permissions";
import { AGENT_INJECTION_RULES } from "@/lib/agents/injection";
import { buildAgentPlan } from "@/lib/agents/plan-builder";
import {
  createAgentRun,
  getOrCreateDefaultAgent,
  getOwnedAgentRun,
  saveAgentRun,
} from "@/lib/db/agents";
import { MAX_AGENT_DURATION_MS, MAX_AGENT_STEPS } from "@/lib/agents/types";
import type {
  AgentPlan,
  AgentProgressEvent,
  AgentRunResult,
  AgentStepRecord,
  FailureClass,
} from "@/lib/agents/types";

function toRecords(plan: AgentPlan): AgentStepRecord[] {
  return plan.steps.slice(0, MAX_AGENT_STEPS).map((step, index) => ({
    index,
    tool: step.tool,
    permission: step.permission,
    args: step.args ?? {},
    label: step.label ?? publicStepLabel(step.tool),
    status: "pending" as const,
    requiresConfirmation: Boolean(step.requiresConfirmation),
    integrations: step.tool.includes("gmail") || step.tool.includes("email")
      ? ["Gmail"]
      : step.tool.includes("github")
        ? ["GitHub"]
        : step.tool.includes("calendar")
          ? ["Calendar"]
          : [],
  }));
}

function finish(result: Omit<AgentRunResult, "pendingWrites">): AgentRunResult {
  return {
    ...result,
    pendingWrites: result.steps.filter((step) => step.status === "awaiting_confirmation"),
  };
}

function composeNoteFromReads(goal: string, steps: AgentStepRecord[]) {
  const lines = steps
    .filter((step) => step.permission === "READ" && step.summary)
    .map((step) => `- ${step.label}: ${step.summary}`);
  return [`${goal}`, "", ...lines].join("\n").slice(0, 4000);
}

export async function runAgent(input: {
  userId: string;
  timeZone: string;
  goal: string;
  conversationId?: string;
  automationRunId?: string;
  autoConfirm?: boolean;
  eventType?: string;
  contextHint?: string;
  onEvent?: (event: AgentProgressEvent) => void;
}): Promise<AgentRunResult> {
  const started = Date.now();
  const agent = await getOrCreateDefaultAgent(input.userId);
  const run = await createAgentRun({
    userId: input.userId,
    agentId: agent.id,
    goal: input.goal,
    conversationId: input.conversationId,
    automationRunId: input.automationRunId,
  });

  input.onEvent?.({ type: "status", value: "PLANNING" });
  let plan: AgentPlan;
  try {
    plan = await buildAgentPlan({
      userId: input.userId,
      timeZone: input.timeZone,
      goal: input.goal,
      autoConfirm: input.autoConfirm,
      eventType: input.eventType,
      contextHint: input.contextHint,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AZIO couldn’t create a plan.";
    await saveAgentRun(run.id, {
      status: "FAILED",
      error: message,
      failureClass: "non_recoverable",
      completedAt: new Date(),
    });
    return finish({
      runId: run.id,
      status: "FAILED",
      goal: input.goal,
      plan: { goal: input.goal, steps: [] },
      steps: [],
      summary: "",
      error: message,
      failureClass: "non_recoverable",
    });
  }

  const steps = toRecords(plan);
  await saveAgentRun(run.id, { status: "EXECUTING", plan, steps });
  input.onEvent?.({ type: "plan", plan });
  input.onEvent?.({ type: "status", value: "EXECUTING" });

  return continueSteps({
    runId: run.id,
    userId: input.userId,
    timeZone: input.timeZone,
    goal: input.goal,
    plan,
    steps,
    started,
    autoConfirm: input.autoConfirm,
    onEvent: input.onEvent,
  });
}

async function continueSteps(input: {
  runId: string;
  userId: string;
  timeZone: string;
  goal: string;
  plan: AgentPlan;
  steps: AgentStepRecord[];
  started: number;
  autoConfirm?: boolean;
  onEvent?: (event: AgentProgressEvent) => void;
}): Promise<AgentRunResult> {
  const ctx = { userId: input.userId, timeZone: input.timeZone };
  let executed = 0;

  for (const step of input.steps) {
    if (step.status === "completed" || step.status === "skipped") continue;
    if (Date.now() - input.started > MAX_AGENT_DURATION_MS) {
      return failRun(input, step, "AZIO stopped this run to protect against long execution.", "non_recoverable");
    }
    if (executed >= MAX_AGENT_STEPS) {
      return failRun(input, step, "AZIO reached the maximum number of steps for this run.", "non_recoverable");
    }

    if (step.status !== "awaiting_confirmation" && step.requiresConfirmation && !input.autoConfirm) {
      for (const pending of input.steps) {
        if (pending.status === "pending" && pending.requiresConfirmation) {
          pending.status = "awaiting_confirmation";
        }
      }
      await saveAgentRun(input.runId, { status: "WAITING", steps: input.steps, plan: input.plan });
      input.onEvent?.({ type: "status", value: "WAITING" });
      return finish({
        runId: input.runId,
        status: "WAITING",
        goal: input.goal,
        plan: input.plan,
        steps: input.steps,
        summary: "AZIO prepared a plan and needs your confirmation before changing anything.",
      });
    }

    step.status = "running";
    input.onEvent?.({ type: "step", step: { ...step } });
    executed += 1;

    if (resolveToolName(step.tool) === "create_note" && !step.args.content) {
      step.args = {
        ...step.args,
        title: String(step.args.title || input.goal).slice(0, 120),
        content: composeNoteFromReads(input.goal, input.steps),
      };
    }

    const result = await executeRegisteredTool(step.tool, step.args, ctx);
    if (!result.ok) {
      const failureClass = classifyFailure(result.error ?? "failed");
      step.status = "failed";
      step.error = result.error;
      step.failureClass = failureClass;
      await recordAgentAudit({
        userId: input.userId,
        agentRunId: input.runId,
        tool: step.tool,
        action: step.label,
        status: "failed",
      });
      return failRun(input, step, result.error ?? "That step failed.", failureClass);
    }

    step.status = "completed";
    step.summary = result.summary ?? publicStepLabel(step.tool);
    await recordAgentAudit({
      userId: input.userId,
      agentRunId: input.runId,
      tool: step.tool,
      action: step.label,
      status: "completed",
    });
    input.onEvent?.({ type: "step", step: { ...step } });
  }

  const summary = await summarizeRun(input);
  await saveAgentRun(input.runId, {
    status: "COMPLETED",
    steps: input.steps,
    summary,
    completedAt: new Date(),
    error: null,
    failureClass: null,
  });
  input.onEvent?.({ type: "summary", text: summary });
  input.onEvent?.({ type: "status", value: "COMPLETED" });
  return finish({
    runId: input.runId,
    status: "COMPLETED",
    goal: input.goal,
    plan: input.plan,
    steps: input.steps,
    summary,
  });
}

async function failRun(
  input: {
    runId: string;
    userId: string;
    goal: string;
    plan: AgentPlan;
    steps: AgentStepRecord[];
  },
  step: AgentStepRecord,
  error: string,
  failureClass: FailureClass
): Promise<AgentRunResult> {
  await saveAgentRun(input.runId, {
    status: "FAILED",
    steps: input.steps,
    error,
    failureClass,
    completedAt: new Date(),
  });
  return finish({
    runId: input.runId,
    status: "FAILED",
    goal: input.goal,
    plan: input.plan,
    steps: input.steps,
    summary: "",
    error,
    failureClass,
  });
}

async function summarizeRun(input: {
  userId: string;
  timeZone: string;
  goal: string;
  steps: AgentStepRecord[];
}) {
  const facts = input.steps
    .filter((step) => step.status === "completed")
    .map((step) => `${step.label}: ${step.summary ?? "done"}`)
    .join("\n");
  const fallback = facts
    ? `I worked through ${input.goal}.\n\n${facts}`
    : `I reviewed ${input.goal}, but there was little to act on.`;

  if (!isAIConfigured()) return fallback;
  try {
    await assertAIRateLimit(input.userId);
    await assertAIUsage(input.userId, input.timeZone);
    const provider = getAIProvider();
    const response = await provider.chat({
      messages: [
        {
          role: "system",
          content: `You are AZIO AI. Write a short user-facing summary of completed work. No chain of thought. ${AGENT_INJECTION_RULES}`,
        },
        { role: "user", content: `Goal: ${input.goal}\nCompleted steps:\n${facts || "none"}` },
      ],
    });
    await recordAIUsage(input.userId, input.timeZone);
    return response.content.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function confirmAgentRun(input: {
  userId: string;
  timeZone: string;
  runId: string;
}): Promise<AgentRunResult> {
  const run = await getOwnedAgentRun(input.userId, input.runId);
  if (!run) {
    return finish({
      runId: input.runId,
      status: "FAILED",
      goal: "",
      plan: { goal: "", steps: [] },
      steps: [],
      summary: "",
      error: "That plan is no longer available.",
      failureClass: "needs_user_input",
    });
  }
  if (run.status !== "WAITING") {
    return finish({
      runId: run.id,
      status: run.status,
      goal: run.goal,
      plan: (run.plan as AgentPlan) ?? { goal: run.goal, steps: [] },
      steps: (run.steps as AgentStepRecord[]) ?? [],
      summary: run.summary ?? "",
      error: run.error ?? undefined,
    });
  }
  const plan = (run.plan as AgentPlan) ?? { goal: run.goal, steps: [] };
  const steps = ((run.steps as AgentStepRecord[]) ?? []).map((step) =>
    step.status === "awaiting_confirmation" ? { ...step, requiresConfirmation: false, status: "pending" as const } : step
  );
  await saveAgentRun(run.id, { status: "EXECUTING", steps });
  return continueSteps({
    runId: run.id,
    userId: input.userId,
    timeZone: input.timeZone,
    goal: run.goal,
    plan,
    steps,
    started: Date.now(),
    autoConfirm: true,
  });
}

export async function cancelAgentRun(input: { userId: string; runId: string }): Promise<AgentRunResult> {
  const run = await getOwnedAgentRun(input.userId, input.runId);
  if (!run) {
    return finish({
      runId: input.runId,
      status: "FAILED",
      goal: "",
      plan: { goal: "", steps: [] },
      steps: [],
      summary: "",
      error: "That plan is no longer available.",
    });
  }
  const steps = ((run.steps as AgentStepRecord[]) ?? []).map((step) =>
    step.status === "awaiting_confirmation" ? { ...step, status: "skipped" as const } : step
  );
  await saveAgentRun(run.id, {
    status: "CANCELLED",
    steps,
    completedAt: new Date(),
    summary: "Cancelled before making changes.",
  });
  await recordAgentAudit({
    userId: input.userId,
    agentRunId: run.id,
    tool: "plan",
    action: "Cancelled plan",
    status: "cancelled",
  });
  return finish({
    runId: run.id,
    status: "CANCELLED",
    goal: run.goal,
    plan: (run.plan as AgentPlan) ?? { goal: run.goal, steps: [] },
    steps,
    summary: "Cancelled before making changes.",
  });
}

export async function retryFailedStep(input: {
  userId: string;
  timeZone: string;
  runId: string;
}): Promise<AgentRunResult> {
  const run = await getOwnedAgentRun(input.userId, input.runId);
  if (!run) {
    return finish({
      runId: input.runId,
      status: "FAILED",
      goal: "",
      plan: { goal: "", steps: [] },
      steps: [],
      summary: "",
      error: "That run is no longer available.",
    });
  }
  const steps = ((run.steps as AgentStepRecord[]) ?? []).map((step) =>
    step.status === "failed" && step.failureClass === "recoverable"
      ? { ...step, status: "pending" as const, error: undefined }
      : step
  );
  await saveAgentRun(run.id, { status: "EXECUTING", steps, error: null });
  return continueSteps({
    runId: run.id,
    userId: input.userId,
    timeZone: input.timeZone,
    goal: run.goal,
    plan: (run.plan as AgentPlan) ?? { goal: run.goal, steps: [] },
    steps,
    started: Date.now(),
    autoConfirm: true,
  });
}
