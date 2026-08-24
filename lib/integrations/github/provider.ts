import { INTEGRATION_SLUGS } from "@/lib/integrations/types";
import { githubOAuthConfigured } from "@/lib/integrations/github/oauth";
import type { IntegrationProviderAdapter } from "@/lib/integrations/provider";

export const githubProvider: IntegrationProviderAdapter = {
  slug: "github",
  provider: INTEGRATION_SLUGS.github,
  isConfigured: githubOAuthConfigured,
};
