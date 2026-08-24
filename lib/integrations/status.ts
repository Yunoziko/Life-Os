import { prisma } from "@/lib/db/prisma";
import { INTEGRATION_CATALOG, type IntegrationSlug } from "@/lib/integrations/types";
import type { IntegrationProvider } from "@/generated/prisma/enums";

export type IntegrationConnectionMap = Record<
  IntegrationSlug,
  { connected: boolean; error: boolean; label: string }
>;

export async function getIntegrationConnectionMap(userId: string): Promise<IntegrationConnectionMap> {
  const rows = await prisma.integrationAccount.findMany({
    where: { userId },
    select: { provider: true, status: true, accessTokenEncrypted: true },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  const empty = {
    connected: false,
    error: false,
    label: "Not connected",
  };

  const result = {
    "google-calendar": { ...empty },
    gmail: { ...empty },
    github: { ...empty },
  } satisfies IntegrationConnectionMap;

  for (const provider of Object.keys(INTEGRATION_CATALOG) as IntegrationSlug[]) {
    const key = provider === "google-calendar" ? "GOOGLE_CALENDAR" : provider === "gmail" ? "GMAIL" : "GITHUB";
    const row = byProvider.get(key as IntegrationProvider);
    if (!row || row.status === "DISCONNECTED" || !row.accessTokenEncrypted) {
      result[provider] = empty;
      continue;
    }
    if (row.status === "ERROR") {
      result[provider] = { connected: false, error: true, label: "Needs reconnect" };
      continue;
    }
    result[provider] = { connected: true, error: false, label: "Connected" };
  }

  return result;
}

export function integrationStatusPrompt(map: IntegrationConnectionMap) {
  return [
    "External integrations (never invent data from a disconnected provider):",
    `- Google Calendar: ${map["google-calendar"].label}`,
    `- Gmail: ${map.gmail.label}`,
    `- GitHub: ${map.github.label}`,
    "If the user asks for a disconnected source, tell them to connect it in Settings → Integrations. Do not fabricate emails, GitHub activity, or Google events.",
  ].join("\n");
}