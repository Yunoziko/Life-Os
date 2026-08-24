"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { disconnectIntegration, isIntegrationConnected } from "@/lib/integrations/accounts";
import { syncGoogleCalendar } from "@/lib/integrations/google/sync";
import { userFacingIntegrationError } from "@/lib/integrations/errors";
import { INTEGRATION_SLUGS, type IntegrationSlug } from "@/lib/integrations/types";
import { getQueue } from "@/lib/jobs/queue";
import type { ActionResult } from "@/types";

function revalidateIntegrations() {
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}

export async function disconnectIntegrationAction(
  slug: IntegrationSlug
): Promise<ActionResult> {
  const user = await requireUser();
  const provider = INTEGRATION_SLUGS[slug];
  if (!provider) return { ok: false, error: "Unknown integration." };

  try {
    await disconnectIntegration(user.id, provider);
    revalidateIntegrations();
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t disconnect that account. Try again." };
  }
}

export async function syncGoogleCalendarAction(): Promise<ActionResult<{ imported: number; updated: number }>> {
  const user = await requireUser();
  if (!(await isIntegrationConnected(user.id, "GOOGLE_CALENDAR"))) {
    return { ok: false, error: "Connect Google Calendar first." };
  }

  try {
    const timeZone = user.profile?.timezone ?? "UTC";
    const result = await syncGoogleCalendar(user.id, timeZone);
    await getQueue().enqueue({
      name: "integration.sync",
      payload: { userId: user.id, provider: "GOOGLE_CALENDAR" },
    });
    revalidateIntegrations();
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: userFacingIntegrationError(error) };
  }
}
