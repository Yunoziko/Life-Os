import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertCanUseFeature } from "@/lib/billing/entitlements";
import { runAgent } from "@/lib/agents/loop";
import { notifyInApp } from "@/lib/notifications/service";
import { assertAutomationRunBudget } from "@/lib/automations/limits";
import { nextScheduledAt, scheduleIdempotencyKey, type AutomationSchedule } from "@/lib/automations/schedule";
import { revalidateWorkspace } from "@/lib/actions/workspace-revalidate";
import type { WorkspaceEventType } from "@/lib/agents/types";

function asSchedule(value: unknown): AutomationSchedule | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.frequency !== "DAILY" && record.frequency !== "WEEKLY" && record.frequency !== "MONTHLY") {
    return null;
  }
  return {
    frequency: record.frequency,
    time: typeof record.time === "string" ? record.time : "08:00",
    weekday: typeof record.weekday === "number" ? record.weekday : undefined,
    monthDay: typeof record.monthDay === "number" ? record.monthDay : undefined,
    timeZone: typeof record.timeZone === "string" ? record.timeZone : "UTC",
  };
}

function objectiveFrom(automation: { actionType: string; actionConfig: unknown; name: string }) {
  const config = automation.actionConfig && typeof automation.actionConfig === "object"
    ? (automation.actionConfig as Record<string, unknown>)
    : {};
  if (typeof config.objective === "string" && config.objective.trim()) return config.objective.trim();
  const defaults: Record<string, string> = {
    DAILY_BRIEF: "Generate my daily brief",
    WEEKLY_REVIEW: "Prepare my weekly review",
    PLAN_DAY: "Plan my day",
    HABIT_REVIEW: "Habit review",
    PROJECT_CHECKLIST: "Suggest a project planning checklist",
    GOAL_CHECKIN: "Goal check-in",
  };
  return defaults[automation.actionType] ?? automation.name;
}

export async function runAutomation(input: {
  automationId: string;
  userId: string;
  timeZone: string;
  idempotencyKey?: string;
  trigger: "MANUAL" | "SCHEDULE" | "EVENT";
  eventType?: WorkspaceEventType;
  contextHint?: string;
}) {
  const automation = await prisma.automation.findFirst({
    where: { id: input.automationId, userId: input.userId },
  });
  if (!automation) throw new Error("Automation not found.");
  if (!automation.enabled && input.trigger !== "MANUAL") {
    throw new Error("This automation is paused.");
  }

  await assertCanUseFeature(input.userId, "AUTOMATION");
  await assertAutomationRunBudget(input.userId, input.timeZone);

  const schedule = asSchedule(automation.schedule);
  const idempotencyKey =
    input.idempotencyKey ||
    (input.trigger === "SCHEDULE" && schedule
      ? scheduleIdempotencyKey(automation.id, schedule)
      : `${automation.id}:${input.trigger}:${Date.now()}`);

  let run;
  try {
    run = await prisma.automationRun.create({
      data: {
        automationId: automation.id,
        status: "RUNNING",
        idempotencyKey,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.automationRun.findUnique({ where: { idempotencyKey } });
      return existing;
    }
    throw error;
  }

  try {
    const result = await runAgent({
      userId: input.userId,
      timeZone: input.timeZone,
      goal: objectiveFrom(automation),
      automationRunId: run.id,
      autoConfirm: input.trigger !== "EVENT",
      eventType: input.eventType ?? automation.eventType ?? undefined,
      contextHint: input.contextHint,
    });

    const waiting = result.status === "WAITING";
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: waiting ? "AWAITING_CONFIRMATION" : result.status === "FAILED" ? "FAILED" : "COMPLETED",
        completedAt: waiting ? null : new Date(),
        error: result.error ?? null,
        result: {
          runId: result.runId,
          summary: result.summary,
          status: result.status,
        },
      },
    });

    const scheduleNext =
      automation.triggerType === "SCHEDULE" && schedule
        ? nextScheduledAt({ ...schedule, timeZone: schedule.timeZone || input.timeZone })
        : null;

    await prisma.automation.update({
      where: { id: automation.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: scheduleNext,
      },
    });

    if (waiting) {
      await notifyInApp({
        userId: input.userId,
        title: "AZIO needs your confirmation.",
        body: result.summary || `${automation.name} is waiting for approval.`,
        href: `/automations/${automation.id}`,
      });
    } else if (result.status === "COMPLETED") {
      await notifyInApp({
        userId: input.userId,
        title:
          automation.actionType === "WEEKLY_REVIEW"
            ? "Your weekly review is ready."
            : automation.actionType === "PLAN_DAY"
              ? "AZIO completed your morning planning."
              : `${automation.name} finished.`,
        body: result.summary.slice(0, 240) || "AZIO finished this automation.",
        href: `/automations/${automation.id}`,
      });
    } else if (result.status === "FAILED") {
      await notifyInApp({
        userId: input.userId,
        title: "An automation needs attention.",
        body: result.error ?? "AZIO couldn’t finish this automation.",
        href: `/automations/${automation.id}`,
      });
    }

    revalidateWorkspace(["/automations", `/automations/${automation.id}`, "/dashboard"]);
    return { ...run, status: waiting ? "AWAITING_CONFIRMATION" : result.status, agent: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AZIO couldn’t run this automation.";
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function tickDueAutomations(limit = 10) {
  const due = await prisma.automation.findMany({
    where: {
      enabled: true,
      triggerType: "SCHEDULE",
      nextRunAt: { lte: new Date() },
    },
    take: limit,
    include: {
      user: { include: { profile: true } },
    },
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const automation of due) {
    try {
      const timeZone = automation.user.profile?.timezone ?? "UTC";
      await runAutomation({
        automationId: automation.id,
        userId: automation.userId,
        timeZone,
        trigger: "SCHEDULE",
      });
      results.push({ id: automation.id, ok: true });
    } catch (error) {
      results.push({
        id: automation.id,
        ok: false,
        error: error instanceof Error ? error.message : "failed",
      });
    }
  }
  return results;
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
    },
  });

  for (const automation of automations) {
    const key = `${automation.id}:event:${input.type}:${input.entityId ?? "none"}`;
    try {
      await runAutomation({
        automationId: automation.id,
        userId: input.userId,
        timeZone: input.timeZone,
        trigger: "EVENT",
        eventType: input.type,
        idempotencyKey: key,
        contextHint: input.label ? `Related record: ${input.label}` : undefined,
      });
    } catch {
      // Event automations should not block the original user action.
    }
  }
}
