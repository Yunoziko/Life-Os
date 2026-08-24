import { runAgent } from "@/lib/agents/loop";
import { isAgentObjective } from "@/lib/agents/planner";
import { buildStructuredAction } from "@/lib/ai/actions";
import type { ChatStreamEvent, StructuredAction } from "@/lib/ai/types";
import {
  appendMessage,
  conversationTitleFrom,
  createConversation,
  getConversation,
  touchConversation,
} from "@/lib/db/ai";
import type { AgentStepRecord } from "@/lib/agents/types";

function actionsFromSteps(steps: AgentStepRecord[]): StructuredAction[] {
  return steps
    .filter((step) => step.status === "awaiting_confirmation")
    .map((step) => buildStructuredAction(step.tool, step.args))
    .filter((action): action is StructuredAction => Boolean(action));
}

export async function maybeRunAgentFromChat(input: {
  userId: string;
  timeZone: string;
  conversationId?: string;
  message: string;
  onEvent: (event: ChatStreamEvent) => void;
}): Promise<boolean> {
  if (!isAgentObjective(input.message)) return false;

  let conversationId = input.conversationId;
  const title = conversationTitleFrom(input.message);
  if (conversationId) {
    const existing = await getConversation(input.userId, conversationId);
    if (!existing) return false;
    await touchConversation(input.userId, conversationId, existing.title);
  } else {
    const created = await createConversation(input.userId, title);
    conversationId = created.id;
  }
  if (!conversationId) return false;

  input.onEvent({ type: "conversation", id: conversationId, title });
  await appendMessage(conversationId, "USER", input.message);
  input.onEvent({ type: "status", value: "thinking" });

  const live: { label: string; status: string }[] = [];
  const result = await runAgent({
    userId: input.userId,
    timeZone: input.timeZone,
    goal: input.message,
    conversationId,
    onEvent: (event) => {
      if (event.type === "plan") {
        live.splice(
          0,
          live.length,
          ...event.plan.steps.map((step) => ({
            label: step.label ?? step.tool,
            status: "pending",
          }))
        );
        input.onEvent({ type: "agent_progress", steps: [...live] });
      }
      if (event.type === "step") {
        live[event.step.index] = {
          label: event.step.label,
          status: event.step.status === "completed" ? "done" : event.step.status,
        };
        input.onEvent({ type: "agent_progress", steps: [...live] });
      }
    },
  });

  const pending = actionsFromSteps(result.steps);
  const progress = result.steps.map((step) => ({
    label: step.label,
    status: step.status === "completed" ? "done" : step.status,
  }));
  input.onEvent({ type: "agent_progress", steps: progress });

  const body =
    result.status === "WAITING"
      ? `${result.summary}\n\nI created a proposed plan.`
      : result.error
        ? result.error
        : result.summary || "AZIO finished that work.";

  const saved = await appendMessage(conversationId, "ASSISTANT", body, {
    agentRunId: result.runId,
    actions: pending,
    agentSteps: progress,
  });

  input.onEvent({
    type: "done",
    conversationId,
    message: saved,
  });
  return true;
}
