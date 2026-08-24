import { INTEGRATION_SLUGS } from "@/lib/integrations/types";
import { googleOAuthConfigured } from "@/lib/integrations/google/oauth";
import type { IntegrationProviderAdapter } from "@/lib/integrations/provider";

export const googleCalendarProvider: IntegrationProviderAdapter = {
  slug: "google-calendar",
  provider: INTEGRATION_SLUGS["google-calendar"],
  isConfigured: googleOAuthConfigured,
};

export const gmailProvider: IntegrationProviderAdapter = {
  slug: "gmail",
  provider: INTEGRATION_SLUGS.gmail,
  isConfigured: googleOAuthConfigured,
};
