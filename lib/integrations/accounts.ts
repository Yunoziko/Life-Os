import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret, isSecretEncryptionConfigured } from "@/lib/crypto/secrets";
import { IntegrationError } from "@/lib/integrations/errors";
import {
  INTEGRATION_CATALOG,
  INTEGRATION_SLUGS,
  slugFromProvider,
  type IntegrationSlug,
  type IntegrationTokens,
  type PublicIntegration,
} from "@/lib/integrations/types";
import type { IntegrationProvider, IntegrationStatus } from "@/generated/prisma/enums";

function toPublicStatus(status?: IntegrationStatus | null): PublicIntegration["status"] {
  if (!status || status === "DISCONNECTED") return "NOT_CONNECTED";
  return status;
}

export function publicIntegration(
  slug: IntegrationSlug,
  row?: {
    status: IntegrationStatus;
    accountLabel: string | null;
    connectedAt: Date;
    lastSyncAt: Date | null;
    lastError: string | null;
  } | null
): PublicIntegration {
  const meta = INTEGRATION_CATALOG[slug];
  return {
    provider: INTEGRATION_SLUGS[slug],
    slug,
    name: meta.name,
    description: meta.description,
    permissions: meta.permissions,
    status: toPublicStatus(row?.status),
    accountLabel: row?.accountLabel ?? null,
    connectedAt: row?.connectedAt.toISOString() ?? null,
    lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
  };
}

export async function listPublicIntegrations(userId: string): Promise<PublicIntegration[]> {
  const rows = await prisma.integrationAccount.findMany({
    where: { userId },
    select: {
      provider: true,
      status: true,
      accountLabel: true,
      connectedAt: true,
      lastSyncAt: true,
      lastError: true,
    },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  return (Object.keys(INTEGRATION_CATALOG) as IntegrationSlug[]).map((slug) =>
    publicIntegration(slug, byProvider.get(INTEGRATION_SLUGS[slug]) ?? null)
  );
}

export async function getIntegrationAccount(userId: string, provider: IntegrationProvider) {
  return prisma.integrationAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function isIntegrationConnected(userId: string, provider: IntegrationProvider) {
  const row = await prisma.integrationAccount.findFirst({
    where: { userId, provider, status: "CONNECTED" },
    select: { id: true, accessTokenEncrypted: true },
  });
  return Boolean(row?.accessTokenEncrypted);
}

export async function upsertIntegrationAccount(
  userId: string,
  provider: IntegrationProvider,
  tokens: IntegrationTokens
) {
  if (!isSecretEncryptionConfigured()) {
    throw new IntegrationError(
      "config",
      "AZIO needs INTEGRATION_ENCRYPTION_KEY (or AUTH_SECRET) to store connection secrets."
    );
  }

  return prisma.integrationAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      status: "CONNECTED",
      accountLabel: tokens.accountLabel ?? null,
      scopes: tokens.scopes,
      accessTokenEncrypted: encryptSecret(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      tokenType: tokens.tokenType ?? "Bearer",
      expiresAt: tokens.expiresAt ?? null,
      lastError: null,
      connectedAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      accountLabel: tokens.accountLabel ?? undefined,
      scopes: tokens.scopes,
      accessTokenEncrypted: encryptSecret(tokens.accessToken),
      ...(tokens.refreshToken
        ? { refreshTokenEncrypted: encryptSecret(tokens.refreshToken) }
        : {}),
      tokenType: tokens.tokenType ?? "Bearer",
      expiresAt: tokens.expiresAt ?? null,
      lastError: null,
    },
  });
}

export async function markIntegrationError(userId: string, provider: IntegrationProvider, message: string) {
  await prisma.integrationAccount.updateMany({
    where: { userId, provider },
    data: { status: "ERROR", lastError: message },
  });
}

export async function touchIntegrationSync(userId: string, provider: IntegrationProvider) {
  await prisma.integrationAccount.updateMany({
    where: { userId, provider, status: "CONNECTED" },
    data: { lastSyncAt: new Date(), lastError: null },
  });
}

async function revokeProviderToken(
  provider: IntegrationProvider,
  accessToken: string,
  refreshToken: string | null
) {
  try {
    if (provider === "GOOGLE_CALENDAR" || provider === "GMAIL") {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken || accessToken }),
      });
      return;
    }
    if (provider === "GITHUB") {
      const clientId = process.env.GITHUB_CLIENT_ID?.trim();
      const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
      if (!clientId || !clientSecret) return;
      await fetch(`https://api.github.com/applications/${clientId}/token`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "AZIO",
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
    }
  } catch {
    // Best-effort. Local disconnect still proceeds.
  }
}

export async function disconnectIntegration(userId: string, provider: IntegrationProvider) {
  const row = await prisma.integrationAccount.findFirst({
    where: { userId, provider },
    select: { accessTokenEncrypted: true, refreshTokenEncrypted: true },
  });
  if (row?.accessTokenEncrypted) {
    try {
      await revokeProviderToken(
        provider,
        decryptSecret(row.accessTokenEncrypted),
        row.refreshTokenEncrypted ? decryptSecret(row.refreshTokenEncrypted) : null
      );
    } catch {
      // Continue with local wipe even if decrypt/revoke fails.
    }
  }
  await prisma.integrationAccount.updateMany({
    where: { userId, provider },
    data: {
      status: "DISCONNECTED",
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      expiresAt: null,
      lastError: null,
    },
  });
}

export async function getAccessToken(userId: string, provider: IntegrationProvider) {
  const row = await prisma.integrationAccount.findFirst({
    where: { userId, provider },
  });
  if (!row || row.status === "DISCONNECTED" || !row.accessTokenEncrypted) {
    throw new IntegrationError(
      "not_connected",
      `I don’t have access to your ${displayName(provider)} yet. Connect it in Settings → Integrations.`
    );
  }
  if (row.status === "ERROR" && !row.accessTokenEncrypted) {
    throw new IntegrationError("expired", `${displayName(provider)} needs to be reconnected.`);
  }
  return {
    ...row,
    accessToken: decryptSecret(row.accessTokenEncrypted),
    refreshToken: row.refreshTokenEncrypted ? decryptSecret(row.refreshTokenEncrypted) : null,
  };
}

function displayName(provider: IntegrationProvider) {
  return INTEGRATION_CATALOG[slugFromProvider(provider)].name;
}
