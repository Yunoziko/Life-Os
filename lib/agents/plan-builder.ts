import { getAIProvider, isAIConfigured } from "@/lib/ai";
import { assertAIRateLimit } from "@/lib/ai/rate-limit";
import { assertAIUsage } from "@/lib/billing/entitlements";
import { recordAIUsage } from "@/lib/billing/usage";
import { formatNow } from "@/lib/ai/context";
import { AGENT_INJECTION_RULES } from "@/lib/agents/injection";
import {
  deterministicPlan,
  detectObjectiveKind,
  parseModelPlan,
  validatePlan,
} from "@/lib/agents/planner";
import type { AgentPlan } from "@/lib/agents/types";

const PLANNER_PROMPT = `You are AZIO AI's planner. Convert the user objective into a JSON plan.

Return ONLY JSON of the form:
{"goal":"...","steps":[{"tool":"get_today_tasks","permission":"READ","args":{}}]}

Rules:
- Use only registered tools.
- Prefer READ tools first.
- At most 8 steps.
- Do not invent records.
- Never include SQL, shell, JavaScript, billing, or auth tools.
- ${AGENT_INJECTION_RULES}
- Do not wrap the JSON in markdown.`;

export async function buildAgentPlan(input: {
  userId: string;
  timeZone: string;
  goal: string;
  autoConfirm?: boolean;
  eventType?: string;
  contextHint?: string;
}): Promise<AgentPlan> {
  const kind = detectObjectiveKind(input.goal, input.eventType);
  if (kind !== "custom") {
    return deterministicPlan({ goal: input.goal, kind, autoConfirm: input.autoConfirm });
  }

  if (!isAIConfigured()) {
    return deterministicPlan({ goal: input.goal, autoConfirm: input.autoConfirm });
  }

  await assertAIRateLimit(input.userId);
  await assertAIUsage(input.userId, input.timeZone);
  const now = formatNow(input.timeZone);
  const provider = getAIProvider();
  const response = await provider.chat({
    messages: [
      { role: "system", content: `${PLANNER_PROMPT}\nCurrent local time: ${now.weekday} ${now.date} ${now.time} (${now.timeZone}).` },
      {
        role: "user",
        content: `Objective: ${input.goal}\n${input.contextHint ?? ""}`.trim(),
      },
    ],
  });
  await recordAIUsage(input.userId, input.timeZone);

  try {
    return validatePlan(parseModelPlan(response.content), { autoConfirm: input.autoConfirm });
  } catch {
    return deterministicPlan({ goal: input.goal, autoConfirm: input.autoConfirm });
  }
}
