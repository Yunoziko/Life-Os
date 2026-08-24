import { NextResponse } from "next/server";
import { EntitlementError } from "@/lib/billing/errors";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { getIntegrationConnectionMap } from "@/lib/integrations/status";
import type { IntegrationSlug } from "@/lib/integrations/types";

export async function assertCanConnectIntegration(userId: string, slug: IntegrationSlug) {
  const map = await getIntegrationConnectionMap(userId);
  if (map[slug].connected) return;
  await assertWithinLimit(userId, "INTEGRATIONS");
}

export function integrationUpgradeRedirect(origin: string) {
  return NextResponse.redirect(new URL("/settings/integrations?upgrade=1", origin));
}

export function isUpgradeError(error: unknown) {
  return error instanceof EntitlementError;
}
