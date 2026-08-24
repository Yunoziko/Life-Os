import { prisma } from "@/lib/db/prisma";
import { AUTOMATION_WORKER_ID } from "@/lib/jobs/config";
import { queueDepth } from "@/lib/jobs/queue";

export async function writeWorkerHeartbeat(input: {
  status: "starting" | "running" | "idle" | "stopped" | "error";
  lastSuccessAt?: Date;
}) {
  const depth = await queueDepth();
  await prisma.workerHeartbeat.upsert({
    where: { id: AUTOMATION_WORKER_ID },
    create: {
      id: AUTOMATION_WORKER_ID,
      status: input.status,
      lastTickAt: new Date(),
      lastSuccessAt: input.lastSuccessAt,
      queueDepth: depth.queued,
      runningCount: depth.running,
    },
    update: {
      status: input.status,
      lastTickAt: new Date(),
      lastSuccessAt: input.lastSuccessAt,
      queueDepth: depth.queued,
      runningCount: depth.running,
    },
  });
}

export async function getWorkerHealth() {
  const [heartbeat, depth, lastRun] = await Promise.all([
    prisma.workerHeartbeat.findUnique({ where: { id: AUTOMATION_WORKER_ID } }),
    queueDepth(),
    prisma.automationRun.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, completedAt: true, automationId: true },
    }),
  ]);

  const lastTickAt = heartbeat?.lastTickAt ?? null;
  const staleMs = 60_000;
  const workerStatus =
    !lastTickAt ? "offline"
    : Date.now() - lastTickAt.getTime() > staleMs ? "stale"
    : heartbeat?.status === "error" ? "error"
    : "ok";

  return {
    worker: {
      status: workerStatus,
      lastTickAt: lastTickAt?.toISOString() ?? null,
      lastSuccessAt: heartbeat?.lastSuccessAt?.toISOString() ?? null,
    },
    queue: {
      name: "azio-automation",
      driver: "database",
      queued: depth.queued,
      running: depth.running,
    },
    lastSuccessfulExecution: lastRun?.completedAt?.toISOString() ?? heartbeat?.lastSuccessAt?.toISOString() ?? null,
  };
}
