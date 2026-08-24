import { isCronAuthorized } from "@/lib/security/http";
import { tickDueAutomations } from "@/lib/automations/runner";
import { appLog } from "@/lib/observability/log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await tickDueAutomations(25);
  const enqueued = results.filter((item) => item.enqueued).length;
  appLog.info("cron_automations", { enqueued });
  return Response.json({ ok: true, enqueued });
}

export async function POST(request: Request) {
  return GET(request);
}
