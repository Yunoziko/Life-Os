import { appConfig } from "@/lib/config";
import { userFacingIntegrationError } from "@/lib/integrations/errors";
import type { IntegrationSlug } from "@/lib/integrations/types";

export function integrationsSettingsUrl(
  query?: { connected?: IntegrationSlug; error?: string; notice?: string }
) {
  const url = new URL("/settings/integrations", `${appConfig.url.replace(/\/$/, "")}/`);
  if (query?.connected) url.searchParams.set("connected", query.connected);
  if (query?.error) url.searchParams.set("error", query.error);
  if (query?.notice) url.searchParams.set("notice", query.notice);
  return url.toString();
}

export function oauthErrorRedirect(error: unknown) {
  return integrationsSettingsUrl({ error: userFacingIntegrationError(error) });
}

export function loginRedirect(callbackPath = "/settings/integrations") {
  const url = new URL("/login", `${appConfig.url.replace(/\/$/, "")}/`);
  url.searchParams.set("callbackUrl", callbackPath);
  return url.toString();
}
