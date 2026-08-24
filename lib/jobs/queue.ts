import { prisma } from "@/lib/db/prisma";
import {
  AUTOMATION_JOB_NAME,
  AUTOMATION_QUEUE_NAME,
  type AutomationJobPayload,
} from "@/lib/jobs/config";
import { automationLog, publicUserRef } from "@/lib/jobs/log";

export type JobName = "index.search" | "ai.summarize" | "habit.rollup" | "integration.sync" | "automation.tick";

export type Job<TPayload = Record<string, unknown>> = {
  name: JobName;
  payload: TPayload;
};

export interface JobQueue {
  enqueue<TPayload>(job: Job<TPayload>): Promise<void>;
}

class InMemoryQueue implements JobQueue {
  async enqueue<TPayload>(job: Job<TPayload>) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[jobs] queued ${job.name}`);
    }
  }
}

export function getQueue(): JobQueue {
  return new InMemoryQueue();
}

export type ClaimedAutomationJob = {
  runId: string;
  automationId: string;
  scheduledFor: Date | null;
  attemptCount: number;
  idempotencyKey: string;
};

type QueueRow = {
  id: string;
  automationId: string;
  scheduledFor: Date | null;
  attemptCount: number;
  idempotencyKey: string;
};

export async function enqueueAutomationJob(input: {
  automationId: string;
  runId: string;
  scheduledFor: Date | null;
}) {
  const payload: AutomationJobPayload = {
    automationId: input.automationId,
    runId: input.runId,
    scheduledFor: input.scheduledFor?.toISOString() ?? null,
  };
  automationLog.info("job_enqueued", {
    queue: AUTOMATION_QUEUE_NAME,
    job: AUTOMATION_JOB_NAME,
    automationId: input.automationId,
    runId: input.runId,
  });
  return payload;
}

export async function claimQueuedAutomationRun(workerId: string): Promise<ClaimedAutomationJob | null> {
  const rows = await prisma.$queryRaw<QueueRow[]>`
    UPDATE "AutomationRun" AS run
    SET
      status = 'RUNNING',
      "lockedAt" = NOW(),
      "lockedBy" = ${workerId},
      "attemptCount" = run."attemptCount" + 1,
      "startedAt" = NOW()
    FROM (
      SELECT id
      FROM "AutomationRun"
      WHERE status = 'QUEUED'
        AND "availableAt" <= NOW()
      ORDER BY "availableAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ) AS picked
    WHERE run.id = picked.id
    RETURNING run.id, run."automationId", run."scheduledFor", run."attemptCount", run."idempotencyKey"
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    runId: row.id,
    automationId: row.automationId,
    scheduledFor: row.scheduledFor,
    attemptCount: row.attemptCount,
    idempotencyKey: row.idempotencyKey,
  };
}

export async function requeueAutomationRun(input: {
  runId: string;
  delayMs: number;
  error: string;
  errorCategory: string;
}) {
  await prisma.automationRun.update({
    where: { id: input.runId },
    data: {
      status: "QUEUED",
      availableAt: new Date(Date.now() + input.delayMs),
      lockedAt: null,
      lockedBy: null,
      error: input.error,
      errorCategory: input.errorCategory,
    },
  });
}

export async function queueDepth() {
  const [queued, running] = await Promise.all([
    prisma.automationRun.count({
      where: { status: "QUEUED", availableAt: { lte: new Date() } },
    }),
    prisma.automationRun.count({ where: { status: "RUNNING" } }),
  ]);
  return { queued, running };
}

export function describeQueueDriver() {
  return {
    queue: AUTOMATION_QUEUE_NAME,
    driver: "database",
    recommendedProduction: "Redis + BullMQ",
  };
}

export { publicUserRef };
