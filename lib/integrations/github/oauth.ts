import { appConfig } from "@/lib/config";
import { IntegrationError } from "@/lib/integrations/errors";
import type { IntegrationTokens } from "@/lib/integrations/types";

const SCOPES = ["read:user"];

export function githubOAuthConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function githubRedirectUri() {
  return `${appConfig.url.replace(/\/$/, "")}/api/integrations/github/callback`;
}

export function githubAuthorizeUrl(state: string) {
  if (!githubOAuthConfigured()) {
    throw new IntegrationError("config", "GitHub OAuth isn’t configured on the server.");
  }
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", githubRedirectUri());
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeGitHubCode(code: string): Promise<IntegrationTokens> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubRedirectUri(),
    }),
  });

  if (!response.ok) {
    throw new IntegrationError("provider", "GitHub didn’t complete the connection.");
  }

  const json = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };

  if (!json.access_token) {
    throw new IntegrationError("provider", "GitHub didn’t return an access token.");
  }

  const user = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${json.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "AZIO",
    },
  });
  const profile = user.ok ? ((await user.json()) as { login?: string }) : {};

  return {
    accessToken: json.access_token,
    tokenType: json.token_type ?? "bearer",
    scopes: json.scope?.split(",") ?? SCOPES,
    accountLabel: profile.login ?? null,
  };
}
