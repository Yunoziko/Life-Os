import { appConfig } from "@/lib/config";
import { IntegrationError } from "@/lib/integrations/errors";
import type { IntegrationTokens } from "@/lib/integrations/types";

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

const GMAIL_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"];

export function googleOAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function googleRedirectUri() {
  return `${appConfig.url.replace(/\/$/, "")}/api/integrations/google/callback`;
}

export function googleAuthorizeUrl(state: string, kind: "calendar" | "gmail") {
  if (!googleOAuthConfigured()) {
    throw new IntegrationError("config", "Google OAuth isn’t configured on the server.");
  }
  const scopes = kind === "calendar" ? CALENDAR_SCOPES : GMAIL_SCOPES;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.AUTH_GOOGLE_ID!);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGoogleCode(code: string): Promise<IntegrationTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new IntegrationError("provider", "Google didn’t complete the connection.");
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
  };

  if (!json.access_token) {
    throw new IntegrationError("provider", "Google didn’t return an access token.");
  }

  let accountLabel: string | null = null;
  if (json.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(json.id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as {
        email?: string;
      };
      accountLabel = payload.email ?? null;
    } catch {
      accountLabel = null;
    }
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    tokenType: json.token_type ?? "Bearer",
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes: json.scope?.split(/\s+/) ?? [],
    accountLabel,
  };
}

export async function refreshGoogleToken(refreshToken: string): Promise<IntegrationTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (response.status === 401 || response.status === 400) {
    throw new IntegrationError("expired", "Google Calendar needs to be reconnected.");
  }
  if (!response.ok) {
    throw new IntegrationError("provider", "Google couldn’t refresh the connection.");
  }

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!json.access_token) {
    throw new IntegrationError("expired", "Google Calendar needs to be reconnected.");
  }

  return {
    accessToken: json.access_token,
    refreshToken,
    tokenType: json.token_type ?? "Bearer",
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes: json.scope?.split(/\s+/) ?? [],
  };
}
