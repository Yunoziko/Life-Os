import { auth } from "@/auth";
import { getWorkerHealth } from "@/lib/jobs/heartbeat";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.WORKER_HEALTH_SECRET?.trim();
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const health = await getWorkerHealth();
  return Response.json({
    ok: health.worker.status === "ok",
    worker: health.worker,
    queue: {
      name: health.queue.name,
      driver: health.queue.driver,
      queued: health.queue.queued,
      running: health.queue.running,
    },
    lastSuccessfulExecution: health.lastSuccessfulExecution,
  });
}
