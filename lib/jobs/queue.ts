export type JobName = "index.search" | "ai.summarize" | "habit.rollup" | "integration.sync";

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
  // Replace with Redis/BullMQ when QUEUE_DRIVER is configured.
  return new InMemoryQueue();
}
