import { z } from "zod";
import type { AgentObjectiveKind, AgentPlan, AgentPlanStep } from "@/lib/agents/types";
import { isRegisteredTool, stepRequiresConfirmation, toolPermission } from "@/lib/agents/permissions";
import { MAX_AGENT_STEPS } from "@/lib/agents/types";

const stepSchema = z.object({
  tool: z.string().min(1).max(80),
  permission: z.enum(["READ", "WRITE", "DESTRUCTIVE"]).optional(),
  args: z.record(z.string(), z.unknown()).optional(),
  requiresConfirmation: z.boolean().optional(),
  label: z.string().max(120).optional(),
});

const planSchema = z.object({
  goal: z.string().min(1).max(240),
  steps: z.array(stepSchema).min(1).max(MAX_AGENT_STEPS),
});

export function detectObjectiveKind(goal: string, eventType?: string): AgentObjectiveKind {
  const text = goal.toLowerCase();
  if (eventType === "PROJECT_CREATED" || /project (planning )?checklist|when i create a project/.test(text)) {
    return "project_checklist";
  }
  if (/prepare (me for )?tomorrow|tomorrow/.test(text) && /plan|prepare/.test(text)) return "prepare_tomorrow";
  if (/plan my day|daily planning|morning planning/.test(text)) return "plan_day";
  if (/daily brief|morning brief/.test(text)) return "daily_brief";
  if (/weekly review|summarize my week/.test(text)) return "weekly_review";
  if (/habit review/.test(text)) return "habit_review";
  if (/goal check-?in|review my goals/.test(text)) return "goal_checkin";
  if (/project review/.test(text)) return "project_review";
  return "custom";
}

export function isAgentObjective(goal: string) {
  return detectObjectiveKind(goal) !== "custom";
}

function step(tool: string, args: Record<string, unknown> = {}, extra?: Partial<AgentPlanStep>): AgentPlanStep {
  const permission = toolPermission(tool) ?? "READ";
  return {
    tool,
    permission,
    args,
    requiresConfirmation: extra?.requiresConfirmation,
    label: extra?.label,
  };
}

export function deterministicPlan(input: {
  goal: string;
  kind?: AgentObjectiveKind;
  projectName?: string;
  autoConfirm?: boolean;
}): AgentPlan {
  const kind = input.kind ?? detectObjectiveKind(input.goal);
  const plans: Record<Exclude<AgentObjectiveKind, "custom">, AgentPlanStep[]> = {
    plan_day: [
      step("get_today_tasks"),
      step("get_today_schedule"),
      step("get_active_goals"),
      step("get_today_habits"),
    ],
    prepare_tomorrow: [
      step("get_upcoming_events"),
      step("get_tasks", { status: "TODO" }),
      step("get_active_goals"),
    ],
    daily_brief: [
      step("get_today_tasks"),
      step("get_tasks", { priority: "HIGH" }),
      step("get_today_schedule"),
      step("get_upcoming_events"),
      step("get_active_goals"),
      step("get_today_habits"),
      step("create_note", { title: "Daily brief" }),
    ],
    weekly_review: [
      step("get_weekly_summary"),
      step("get_active_goals"),
      step("get_habits"),
      step("get_active_projects"),
      step("get_upcoming_events"),
      step("get_github_activity"),
      step("create_note", { title: "Weekly review" }),
    ],
    habit_review: [step("get_today_habits"), step("get_habits")],
    goal_checkin: [step("get_active_goals"), step("get_tasks")],
    project_review: [
      step("get_active_projects"),
      step("get_tasks"),
      step("get_active_goals"),
      step("create_note", { title: "Project review" }),
    ],
    project_checklist: [
      step("get_active_projects"),
      step("create_task", { title: "Clarify outcome and constraints" }),
      step("create_task", { title: "Break work into the first three tasks" }),
      step("create_task", { title: "Identify risks and dependencies" }),
      step("create_task", { title: "Set a check-in date" }),
    ],
  };

  if (kind !== "custom") {
    return validatePlan({ goal: input.goal, steps: plans[kind] }, { autoConfirm: input.autoConfirm });
  }

  return validatePlan(
    {
      goal: input.goal,
      steps: [step("get_today_tasks"), step("get_active_goals"), step("get_today_schedule")],
    },
    { autoConfirm: input.autoConfirm }
  );
}

export function validatePlan(raw: unknown, options?: { autoConfirm?: boolean }): AgentPlan {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AZIO could not use that plan. The steps were not structured.");
  }

  const writeCount = parsed.data.steps.filter((item) => {
    const permission = toolPermission(item.tool);
    return permission === "WRITE" || permission === "DESTRUCTIVE";
  }).length;

  const steps: AgentPlanStep[] = parsed.data.steps.map((item) => {
    if (!isRegisteredTool(item.tool)) {
      throw new Error("AZIO can only call registered tools.");
    }
    const permission = toolPermission(item.tool);
    if (!permission) throw new Error("AZIO can only call registered tools.");
    if (item.permission && item.permission !== permission) {
      throw new Error("AZIO rejected a plan with incorrect tool permissions.");
    }
    const requiresConfirmation =
      item.requiresConfirmation ??
      stepRequiresConfirmation({
        tool: item.tool,
        writeCount,
        autoConfirm: options?.autoConfirm,
      });
    return {
      tool: item.tool,
      permission,
      args: item.args ?? {},
      requiresConfirmation,
      label: item.label,
    };
  });

  return { goal: parsed.data.goal, steps };
}

export function parseModelPlan(text: string): unknown {
  const fenced = text.match(/\{[\s\S]*\}/);
  if (!fenced) throw new Error("AZIO could not use that plan. The steps were not structured.");
  try {
    return JSON.parse(fenced[0]);
  } catch {
    throw new Error("AZIO could not use that plan. The steps were not structured.");
  }
}
