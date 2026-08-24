export const AUTOMATION_WORKER_ID = "automation-worker";
export const AUTOMATION_QUEUE_NAME = "azio-automation";
export const AUTOMATION_JOB_NAME = "run-automation";

export type AutomationJobPayload = {
  automationId: string;
  scheduledFor: string | null;
  runId: string;
};

export function workerConcurrency() {
  const parsed = Number(process.env.AUTOMATION_WORKER_CONCURRENCY ?? 5);
  if (!Number.isFinite(parsed) || parsed < 1) return 5;
  return Math.min(25, Math.floor(parsed));
}

export function schedulerIntervalMs() {
  const parsed = Number(process.env.AUTOMATION_SCHEDULER_INTERVAL_MS ?? 15_000);
  if (!Number.isFinite(parsed) || parsed < 1_000) return 15_000;
  return parsed;
}

export function workerPollMs() {
  const parsed = Number(process.env.AUTOMATION_WORKER_POLL_MS ?? 2_000);
  if (!Number.isFinite(parsed) || parsed < 250) return 2_000;
  return parsed;
}

export function redisUrl() {
  return process.env.REDIS_URL?.trim() || "";
}

export function dueAutomationWhere(now = new Date()) {
  return {
    enabled: true,
    triggerType: "SCHEDULE" as const,
    nextRunAt: { lte: now },
    pauseReason: null,
  };
}
