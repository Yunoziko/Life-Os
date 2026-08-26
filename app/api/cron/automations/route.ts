import { isCronAuthorized } from "@/lib/security/http";
import { tickDueAutomations } from "@/lib/automations/runner";
import { drainQueuedAutomationJobs } from "@/lib/jobs/worker";
import { appLog } from "@/lib/observability/log";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await tickDueAutomations(25);
  const enqueued = results.filter((item) => item.enqueued).length;
  const processed = await drainQueuedAutomationJobs(3);
  appLog.info("cron_automations", { enqueued, processed });
  return Response.json({ ok: true, enqueued, processed });
}

export async function POST(request: Request) {
  return GET(request);
}
