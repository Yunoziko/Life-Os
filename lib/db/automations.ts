import { prisma } from "@/lib/db/prisma";
import { nextScheduledAt, type AutomationSchedule } from "@/lib/automations/schedule";
import type { Prisma } from "@/generated/prisma/client";

export async function listAutomations(userId: string) {
  return prisma.automation.findMany({
    where: { userId },
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          error: true,
        },
      },
    },
  });
}

export async function getOwnedAutomation(userId: string, id: string) {
  return prisma.automation.findFirst({
    where: { id, userId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { agentRun: true },
      },
    },
  });
}

export async function getOwnedAutomationRun(userId: string, runId: string) {
  return prisma.automationRun.findFirst({
    where: { id: runId, automation: { userId } },
    include: {
      automation: true,
      agentRun: true,
    },
  });
}

export async function countAutomations(userId: string) {
  return prisma.automation.count({ where: { userId } });
}

export async function createAutomationRecord(input: {
  userId: string;
  name: string;
  description?: string;
  triggerType: "MANUAL" | "SCHEDULE" | "EVENT";
  actionType: string;
  schedule?: AutomationSchedule | null;
  eventType?: string | null;
  actionConfig: Record<string, unknown>;
  enabled?: boolean;
}) {
  const nextRunAt =
    input.triggerType === "SCHEDULE" && input.schedule ? nextScheduledAt(input.schedule) : null;
  return prisma.automation.create({
    data: {
      userId: input.userId,
      name: input.name,
      description: input.description,
      triggerType: input.triggerType,
      actionType: input.actionType,
      enabled: input.enabled ?? true,
      timezone: input.schedule?.timeZone ?? "UTC",
      schedule: (input.schedule ?? undefined) as Prisma.InputJsonValue | undefined,
      eventType: input.eventType,
      actionConfig: input.actionConfig as Prisma.InputJsonValue,
      nextRunAt,
    },
  });
}

export async function updateAutomationRecord(
  userId: string,
  id: string,
  data: {
    name?: string;
    description?: string | null;
    enabled?: boolean;
    schedule?: AutomationSchedule | null;
    timezone?: string;
    pauseReason?: string | null;
    nextRunAt?: Date | null;
    lastRunAt?: Date | null;
  }
) {
  return prisma.automation.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      timezone: data.timezone,
      pauseReason: data.pauseReason,
      schedule: data.schedule === undefined ? undefined : (data.schedule as Prisma.InputJsonValue),
      nextRunAt: data.nextRunAt,
      lastRunAt: data.lastRunAt,
    },
  });
}
