import { auth } from "@/auth";
import { tickDueAutomations } from "@/lib/automations/runner";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await tickDueAutomations(25);
  return Response.json({ ok: true, enqueued: results });
}

export async function POST(request: Request) {
  return GET(request);
}
