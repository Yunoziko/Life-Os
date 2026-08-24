import type { IntegrationProvider, IntegrationStatus } from "@/generated/prisma/enums";

export type IntegrationSlug = "google-calendar" | "gmail" | "github";

export const INTEGRATION_SLUGS: Record<IntegrationSlug, IntegrationProvider> = {
  "google-calendar": "GOOGLE_CALENDAR",
  gmail: "GMAIL",
  github: "GITHUB",
};

export function slugFromProvider(provider: IntegrationProvider): IntegrationSlug {
  if (provider === "GOOGLE_CALENDAR") return "google-calendar";
  if (provider === "GMAIL") return "gmail";
  return "github";
}

export type PublicIntegration = {
  provider: IntegrationProvider;
  slug: IntegrationSlug;
  name: string;
  description: string;
  permissions: string[];
  status: IntegrationStatus | "NOT_CONNECTED";
  accountLabel: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export type IntegrationTokens = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  expiresAt?: Date | null;
  scopes: string[];
  accountLabel?: string | null;
};

export const INTEGRATION_CATALOG: Record<
  IntegrationSlug,
  { name: string; description: string; permissions: string[] }
> = {
  "google-calendar": {
    name: "Google Calendar",
    description: "Sync your schedule with AZIO.",
    permissions: ["Read calendar events", "Create calendar events", "Update calendar events"],
  },
  gmail: {
    name: "Gmail",
    description: "Let AZIO search recent mail when you ask.",
    permissions: ["Read email metadata and snippets"],
  },
  github: {
    name: "GitHub",
    description: "See repositories, commits, issues, and pull requests.",
    permissions: ["Read public profile", "Read repositories you can access"],
  },
};
