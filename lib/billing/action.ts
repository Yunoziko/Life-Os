import { EntitlementError } from "@/lib/billing/errors";
import type { FeatureKey } from "@/lib/billing/config";
import type { ActionResult } from "@/types";

export function isUpgradeResult(
  result: ActionResult<unknown>
): result is { ok: false; error: string; code: "upgrade_required"; feature: FeatureKey } {
  return !result.ok && result.code === "upgrade_required";
}

export function entitlementActionError(error: unknown): Extract<ActionResult, { ok: false }> | null {
  if (error instanceof EntitlementError) {
    return { ok: false, error: error.message, code: "upgrade_required", feature: error.feature };
  }
  return null;
}
