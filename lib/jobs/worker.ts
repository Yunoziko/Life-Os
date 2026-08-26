import { executeAutomationRun } from "@/lib/automations/runner";
import { workerConcurrency, workerPollMs } from "@/lib/jobs/config";
import {
  classifyAutomationError,
  isRetryableAutomationError,
  MAX_AUTOMATION_ATTEMPTS,
  publicAutomationError,
  retryDelayMs,
} from "@/lib/jobs/errors";
import { writeWorkerHeartbeat } from "@/lib/jobs/heartbeat";
import { automationLog, publicUserRef } from "@/lib/jobs/log";
import { claimQueuedAutomationRun, requeueAutomationRun } from "@/lib/jobs/queue";
import { enqueueDueAutomations } from "@/lib/jobs/scheduler";

function sleep(ms: number, wake?: { current: (() => void) | null }) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (wake) {
      wake.current = () => {
        clearTimeout(timer);
        resolve();
      };
    }
  });
}

export async function processOneAutomationJob(workerId: string) {
  const job = await claimQueuedAutomationRun(workerId);
  if (!job) return false;

  automationLog.info("job_claimed", {
    jobId: job.runId,
    runId: job.runId,
    automationId: job.automationId,
    attemptCount: job.attemptCount,
  });

  try {
    const result = await executeAutomationRun(job.runId);
    if (result.status === "FAILED" && result.retryable && job.attemptCount < MAX_AUTOMATION_ATTEMPTS) {
      const delay = retryDelayMs(job.attemptCount);
      await requeueAutomationRun({
        runId: job.runId,
        delayMs: delay,
        error: result.error ?? "AZIO will retry this automation.",
        errorCategory: result.category ?? "TRANSIENT",
      });
      automationLog.warn("job_requeued", {
        jobId: job.runId,
        runId: job.runId,
        automationId: job.automationId,
        attemptCount: job.attemptCount,
        delayMs: delay,
      });
      return true;
    }
    if (result.status === "COMPLETED" || result.status === "AWAITING_CONFIRMATION") {
      await writeWorkerHeartbeat({ status: "running", lastSuccessAt: new Date() });
    }
    return true;
  } catch (error) {
    const category = classifyAutomationError(error);
    const message = publicAutomationError(error, category);
    if (isRetryableAutomationError(category) && job.attemptCount < MAX_AUTOMATION_ATTEMPTS) {
      await requeueAutomationRun({
        runId: job.runId,
        delayMs: retryDelayMs(job.attemptCount),
        error: message,
        errorCategory: category,
      });
      return true;
    }
    automationLog.error("job_failed", {
      jobId: job.runId,
      runId: job.runId,
      automationId: job.automationId,
      user: publicUserRef(job.automationId),
      errorCategory: category,
    });
    throw error;
  }
}

export async function drainQueuedAutomationJobs(limit = 3) {
  let processed = 0;
  for (let i = 0; i < limit; i += 1) {
    const worked = await processOneAutomationJob(`cron-${process.pid}`);
    if (!worked) break;
    processed += 1;
  }
  return processed;
}

export async function startAutomationWorker(options?: { includeScheduler?: boolean }) {
  const includeScheduler = options?.includeScheduler ?? process.env.AUTOMATION_WORKER_INCLUDE_SCHEDULER !== "0";
  const concurrency = workerConcurrency();
  const pollMs = workerPollMs();
  const workerId = `worker-${process.pid}`;
  let running = true;
  const wake = { current: null as (() => void) | null };

  automationLog.info("worker_started", {
    jobId: workerId,
    concurrency,
    includeScheduler,
  });
  await writeWorkerHeartbeat({ status: "starting" });

  const stop = () => {
    if (!running) return;
    running = false;
    automationLog.info("worker_stopping", { jobId: workerId });
    wake.current?.();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const loops = Array.from({ length: concurrency }, async (_, index) => {
    const id = `${workerId}:${index}`;
    while (running) {
      try {
        if (includeScheduler && index === 0) {
          await enqueueDueAutomations(25);
        }
        const worked = await processOneAutomationJob(id);
        await writeWorkerHeartbeat({ status: worked ? "running" : "idle" });
        if (!worked) await sleep(pollMs, wake);
      } catch (error) {
        automationLog.error("worker_loop_error", {
          jobId: id,
          error: error instanceof Error ? error.name : "unknown",
        });
        await writeWorkerHeartbeat({ status: "error" });
        await sleep(pollMs, wake);
      }
    }
  });

  await Promise.all(loops);
  await writeWorkerHeartbeat({ status: "stopped" });
  automationLog.info("worker_stopped", { jobId: workerId });
}

export async function startAutomationScheduler() {
  const { schedulerIntervalMs } = await import("@/lib/jobs/config");
  const interval = schedulerIntervalMs();
  let running = true;
  const stop = () => {
    running = false;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  automationLog.info("scheduler_started", { interval });
  while (running) {
    try {
      const results = await enqueueDueAutomations(50);
      automationLog.info("scheduler_tick", { enqueued: results.filter((item) => item.enqueued).length });
    } catch (error) {
      automationLog.error("scheduler_tick_failed", {
        error: error instanceof Error ? error.name : "unknown",
      });
    }
    await sleep(interval);
  }
}
