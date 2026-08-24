import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateNextRun, parseAutomationSchedule, scheduleIdempotencyKey } from "@/lib/automations/schedule";
import { dueAutomationWhere } from "@/lib/jobs/config";
import { enqueueAutomationJob } from "@/lib/jobs/queue";
import { automationLog, publicUserRef } from "@/lib/jobs/log";

export async function enqueueDueAutomations(limit = 25) {
  const due = await prisma.automation.findMany({
    where: dueAutomationWhere(),
    orderBy: { nextRunAt: "asc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      timezone: true,
      schedule: true,
      nextRunAt: true,
    },
  });

  const results: { id: string; enqueued: boolean; runId?: string; duplicate?: boolean }[] = [];
  for (const automation of due) {
    try {
      const queued = await enqueueScheduledAutomation(automation.id);
      results.push({
        id: automation.id,
        enqueued: Boolean(queued),
        runId: queued?.runId,
        duplicate: queued?.duplicate,
      });
    } catch (error) {
      automationLog.warn("scheduler_enqueue_failed", {
        automationId: automation.id,
        user: publicUserRef(automation.userId),
        error: error instanceof Error ? error.name : "unknown",
      });
      results.push({ id: automation.id, enqueued: false });
    }
  }
  return results;
}

export async function enqueueScheduledAutomation(automationId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Automation"
      WHERE id = ${automationId}
        AND enabled = true
        AND "triggerType" = 'SCHEDULE'
        AND "nextRunAt" <= NOW()
      FOR UPDATE
    `;
    if (!rows[0]) return null;

    const automation = await tx.automation.findUniqueOrThrow({
      where: { id: automationId },
      include: { user: { include: { profile: true } } },
    });
    const timeZone = automation.timezone || automation.user.profile?.timezone || "UTC";
    const schedule = parseAutomationSchedule(automation.schedule, timeZone);
    if (!schedule || !automation.nextRunAt) return null;

    const scheduledFor = automation.nextRunAt;
    const idempotencyKey = scheduleIdempotencyKey(automation.id, scheduledFor);
    const nextRunAt = calculateNextRun(schedule, scheduledFor);

    try {
      const run = await tx.automationRun.create({
        data: {
          automationId: automation.id,
          status: "QUEUED",
          idempotencyKey,
          scheduledFor,
          availableAt: new Date(),
        },
      });
      await tx.automation.update({
        where: { id: automation.id },
        data: { nextRunAt },
      });
      await enqueueAutomationJob({
        automationId: automation.id,
        runId: run.id,
        scheduledFor,
      });
      return { runId: run.id, duplicate: false as const };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await tx.automationRun.findUnique({ where: { idempotencyKey } });
        if (existing && automation.nextRunAt && automation.nextRunAt.getTime() <= scheduledFor.getTime()) {
          await tx.automation.update({
            where: { id: automation.id },
            data: { nextRunAt },
          });
        }
        return existing ? { runId: existing.id, duplicate: true as const } : null;
      }
      throw error;
    }
  });
}

export async function enqueueManualAutomation(input: {
  automationId: string;
  userId: string;
}) {
  const automation = await prisma.automation.findFirst({
    where: { id: input.automationId, userId: input.userId },
  });
  if (!automation) throw new Error("Automation not found.");

  const run = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      status: "QUEUED",
      idempotencyKey: `${automation.id}:manual:${crypto.randomUUID()}`,
      availableAt: new Date(),
    },
  });
  await enqueueAutomationJob({
    automationId: automation.id,
    runId: run.id,
    scheduledFor: null,
  });
  return run;
}

export async function enqueueEventAutomation(input: {
  automationId: string;
  userId: string;
  idempotencyKey: string;
}) {
  try {
    const run = await prisma.automationRun.create({
      data: {
        automationId: input.automationId,
        status: "QUEUED",
        idempotencyKey: input.idempotencyKey,
        availableAt: new Date(),
      },
    });
    await enqueueAutomationJob({
      automationId: input.automationId,
      runId: run.id,
      scheduledFor: null,
    });
    return { runId: run.id, duplicate: false as const };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.automationRun.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      return existing ? { runId: existing.id, duplicate: true as const } : null;
    }
    throw error;
  }
}
