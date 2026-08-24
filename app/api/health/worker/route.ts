import { getWorkerHealth } from "@/lib/jobs/heartbeat";
import { isWorkerHealthAuthorized } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isWorkerHealthAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const health = await getWorkerHealth();
  return Response.json({
    ok: health.worker.status === "ok",
    worker: {
      status: health.worker.status,
      lastTickAt: health.worker.lastTickAt,
    },
    queue: {
      queued: health.queue.queued,
      running: health.queue.running,
    },
  });
}
