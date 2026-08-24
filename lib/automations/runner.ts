import { prisma } from "@/lib/db/prisma";
import { assertCanUseFeature, canUseFeature } from "@/lib/billing/entitlements";
import { EntitlementError } from "@/lib/billing/errors";
import { runAgent } from "@/lib/agents/loop";
import { notifyInApp } from "@/lib/notifications/service";
import { assertAutomationRunBudget } from "@/lib/automations/limits";
import { parseAutomationSchedule } from "@/lib/automations/schedule";
import { enqueueDueAutomations, enqueueEventAutomation } from "@/lib/jobs/scheduler";
import { automationLog, publicUserRef } from "@/lib/jobs/log";
import {
  classifyAutomationError,
  MAX_AUTOMATION_ATTEMPTS,
  publicAutomationError,
  type AutomationErrorCategory,
} from "@/lib/jobs/errors";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { WorkspaceEventType } from "@/lib/agents/types";
import type { NotificationType } from "@/generated/prisma/client";

const SAFE_TEMPLATE_ACTIONS = new Set([
  "DAILY_BRIEF",
  "WEEKLY_REVIEW",
  "PLAN_DAY",
  "HABIT_REVIEW",
  "GOAL_CHECKIN",
  "PROJECT_REVIEW",
]);

function objectiveFrom(automation: { actionType: string; actionConfig: unknown; name: string }) {
  const config =
    automation.actionConfig && typeof automation.actionConfig === "object"
      ? (automation.actionConfig as Record<string, unknown>)
      : {};
  if (typeof config.objective === "string" && config.objective.trim()) return config.objective.trim();
  const defaults: Record<string, string> = {
    DAILY_BRIEF: "Generate my daily brief",
    WEEKLY_REVIEW: "Prepare my weekly review",
    PLAN_DAY: "Plan my day",
    HABIT_REVIEW: "Habit review",
    PROJECT_CHECKLIST: "Suggest a project planning checklist",
    PROJECT_REVIEW: "Project review",
    GOAL_CHECKIN: "Goal check-in",
  };
  return defaults[automation.actionType] ?? automation.name;
}

function triggerFromKey(idempotencyKey: string): "MANUAL" | "SCHEDULE" | "EVENT" {
  if (idempotencyKey.includes(":schedule:")) return "SCHEDULE";
  if (idempotencyKey.includes(":event:")) return "EVENT";
  return "MANUAL";
}

export async function executeAutomationRun(runId: string) {
  const run = await prisma.automationRun.findUnique({
    where: { id: runId },
    include: {
      automation: {
        include: { user: { include: { profile: true } } },
      },
    },
  });
  if (!run) {
    throw Object.assign(new Error("Automation run not found."), { category: "NOT_FOUND" as const });
  }

  const automation = run.automation;
  const userId = automation.userId;
  const timeZone = automation.timezone || automation.user.profile?.timezone || "UTC";
  const trigger = triggerFromKey(run.idempotencyKey);
  const started = Date.now();

  automationLog.info("run_started", {
    automationId: automation.id,
    runId: run.id,
    user: publicUserRef(userId),
    status: "RUNNING",
    attemptCount: run.attemptCount,
  });

  if (trigger !== "MANUAL" && !automation.enabled) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "CANCELLED",
        error: "This automation is paused.",
        errorCategory: "PERMANENT",
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
    return { status: "CANCELLED" as const, retryable: false };
  }

  const isPro = await canUseFeature(userId, "AUTOMATION");
  if (!isPro) {
    await pauseForMissingPro(automation.id, userId);
    await failRun(run.id, "This automation is paused because AZIO Pro is required.", "ENTITLEMENT");
    return { status: "FAILED" as const, retryable: false, category: "ENTITLEMENT" as const };
  }

  try {
    await assertCanUseFeature(userId, "AUTOMATION");
    await assertAutomationRunBudget(userId, timeZone);

    const autoConfirm = SAFE_TEMPLATE_ACTIONS.has(automation.actionType);
    const result = await runAgent({
      userId,
      timeZone,
      goal: objectiveFrom(automation),
      automationRunId: run.id,
      autoConfirm,
      eventType: automation.eventType ?? undefined,
    });

    const waiting = result.status === "WAITING";
    const failed = result.status === "FAILED";
    const category = failed ? classifyAutomationError(result.error) : null;
    const retryable = Boolean(failed && category === "TRANSIENT" && run.attemptCount < MAX_AUTOMATION_ATTEMPTS);
    const status = waiting ? "AWAITING_CONFIRMATION" : failed ? "FAILED" : "COMPLETED";
    const publicError = failed ? publicAutomationError(result.error, category ?? "PERMANENT") : null;

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: waiting || retryable ? null : new Date(),
        lockedAt: waiting ? run.lockedAt : null,
        lockedBy: waiting ? run.lockedBy : null,
        error: publicError,
        errorCategory: category,
        result: {
          runId: result.runId,
          summary: result.summary,
          status: result.status,
        },
      },
    });

    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: new Date() },
    });

    await notifyAutomationResult({
      userId,
      automation,
      runId: run.id,
      agentRunId: result.runId,
      waiting,
      failed: failed && !retryable,
      summary: result.summary,
      error: publicError,
    });

    automationLog.info("run_finished", {
      automationId: automation.id,
      runId: run.id,
      user: publicUserRef(userId),
      status,
      duration: Date.now() - started,
    });

    revalidateWorkspace(["/automations", `/automations/${automation.id}`, "/dashboard", "/notifications"]);
    return {
      status,
      retryable,
      category,
      error: publicError,
    };
  } catch (error) {
    const category = classifyAutomationError(error);
    const message = publicAutomationError(error, category);
    const retryable = category === "TRANSIENT" && run.attemptCount < MAX_AUTOMATION_ATTEMPTS;
    if (error instanceof EntitlementError) {
      await pauseForMissingPro(automation.id, userId);
    }
    await failRun(run.id, message, category, retryable);
    if (!retryable && !(error instanceof EntitlementError)) {
      await notifyAutomationResult({
        userId,
        automation,
        runId: run.id,
        agentRunId: "",
        waiting: false,
        failed: true,
        summary: "",
        error: message,
      });
    }
    automationLog.warn("run_failed", {
      automationId: automation.id,
      runId: run.id,
      user: publicUserRef(userId),
      status: "FAILED",
      duration: Date.now() - started,
      errorCategory: category,
    });
    return { status: "FAILED" as const, retryable, category, error: message };
  }
}

async function failRun(
  runId: string,
  error: string,
  errorCategory: AutomationErrorCategory,
  retryable = false
) {
  await prisma.automationRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      error,
      errorCategory,
      completedAt: retryable ? null : new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function pauseForMissingPro(automationId: string, userId: string) {
  await prisma.automation.update({
    where: { id: automationId },
    data: { enabled: false, pauseReason: "PRO_REQUIRED" },
  });
  await notifyInApp({
    userId,
    type: "SYSTEM",
    title: "An automation was paused.",
    message: "This automation is paused because AZIO Pro is required.",
    href: `/automations/${automationId}`,
    data: { automationId },
  });
}

async function notifyAutomationResult(input: {
  userId: string;
  automation: { id: string; name: string; actionType: string };
  runId: string;
  agentRunId: string;
  waiting: boolean;
  failed: boolean;
  summary: string;
  error: string | null;
}) {
  if (input.waiting) {
    await notifyInApp({
      userId: input.userId,
      type: "AUTOMATION_WAITING",
      title: "AZIO is waiting for your approval.",
      message: input.summary || `${input.automation.name} is waiting for approval.`,
      href: `/automations/${input.automation.id}`,
      data: { automationId: input.automation.id, runId: input.runId, agentRunId: input.agentRunId },
    });
    return;
  }
  if (input.failed) {
    await notifyInApp({
      userId: input.userId,
      type: "AUTOMATION_FAILED",
      title: "An automation needs attention.",
      message: input.error ?? "AZIO couldn’t finish this automation.",
      href: `/automations/${input.automation.id}`,
      data: { automationId: input.automation.id, runId: input.runId },
    });
    return;
  }

  const type: NotificationType =
    input.automation.actionType === "DAILY_BRIEF"
      ? "DAILY_BRIEF_READY"
      : input.automation.actionType === "WEEKLY_REVIEW"
        ? "WEEKLY_REVIEW_READY"
        : "AUTOMATION_COMPLETED";
  const title =
    type === "DAILY_BRIEF_READY"
      ? "Your Daily Brief is ready."
      : type === "WEEKLY_REVIEW_READY"
        ? "Your weekly review is ready."
        : `${input.automation.name} finished.`;

  await notifyInApp({
    userId: input.userId,
    type,
    title,
    message: input.summary.slice(0, 240) || "AZIO finished this automation.",
    href: `/automations/${input.automation.id}`,
    data: { automationId: input.automation.id, runId: input.runId, agentRunId: input.agentRunId },
  });
}

export async function syncAutomationRunFromAgent(agentRunId: string, userId: string) {
  const agentRun = await prisma.agentRun.findFirst({
    where: { id: agentRunId, userId },
  });
  if (!agentRun?.automationRunId) return;
  const waiting = agentRun.status === "WAITING";
  const status =
    waiting ? "AWAITING_CONFIRMATION"
    : agentRun.status === "FAILED" ? "FAILED"
    : agentRun.status === "CANCELLED" ? "CANCELLED"
    : agentRun.status === "COMPLETED" ? "COMPLETED"
    : "RUNNING";
  await prisma.automationRun.update({
    where: { id: agentRun.automationRunId },
    data: {
      status,
      completedAt: ["COMPLETED", "FAILED", "CANCELLED"].includes(status) ? new Date() : null,
      error: agentRun.error,
      result: {
        runId: agentRun.id,
        summary: agentRun.summary,
        status: agentRun.status,
      },
    },
  });
}

export async function tickDueAutomations(limit = 25) {
  return enqueueDueAutomations(limit);
}

export async function emitWorkspaceEvent(input: {
  userId: string;
  timeZone: string;
  type: WorkspaceEventType;
  entityId?: string;
  label?: string;
}) {
  const automations = await prisma.automation.findMany({
    where: {
      userId: input.userId,
      enabled: true,
      triggerType: "EVENT",
      eventType: input.type,
      pauseReason: null,
    },
  });

  for (const automation of automations) {
    const key = `${automation.id}:event:${input.type}:${input.entityId ?? "none"}`;
    try {
      await enqueueEventAutomation({
        automationId: automation.id,
        userId: input.userId,
        idempotencyKey: key,
      });
    } catch {
      // Event automations should not block the original user action.
    }
  }
}

export function automationTimeZone(automation: { timezone?: string | null; schedule?: unknown }, fallback = "UTC") {
  return parseAutomationSchedule(automation.schedule, automation.timezone || fallback)?.timeZone
    || automation.timezone
    || fallback;
}
