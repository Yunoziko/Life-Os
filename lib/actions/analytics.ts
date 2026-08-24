"use server";

import { requireUser } from "@/lib/auth/session";
import { generateAnalyticsReview } from "@/lib/ai/analytics-review";
import { userFacingAIError } from "@/lib/ai/errors";
import { entitlementActionError } from "@/lib/billing/action";
import type { ActionResult } from "@/types";

export async function generateWeeklyReviewAction(formData: FormData): Promise<ActionResult<{ text: string }>> {
  return generateReview("weekly", formData);
}

export async function generateDailyBriefAction(formData: FormData): Promise<ActionResult<{ text: string }>> {
  return generateReview("daily", formData);
}

async function generateReview(
  kind: "weekly" | "daily",
  formData: FormData
): Promise<ActionResult<{ text: string }>> {
  try {
    const user = await requireUser();
    const text = await generateAnalyticsReview({
      userId: user.id,
      timeZone: user.profile?.timezone ?? "UTC",
      weekStartsOn: user.profile?.weekStartsOn ?? 1,
      kind,
      range: {
        range: String(formData.get("range") ?? "this-week"),
        from: String(formData.get("from") ?? ""),
        to: String(formData.get("to") ?? ""),
      },
    });
    return { ok: true, data: { text } };
  } catch (error) {
    return entitlementActionError(error) ?? { ok: false, error: userFacingAIError(error) };
  }
}
