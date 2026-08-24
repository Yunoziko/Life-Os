import type { IntegrationProvider } from "@/generated/prisma/enums";
import type { IntegrationSlug } from "@/lib/integrations/types";

export type IntegrationProviderAdapter = {
  slug: IntegrationSlug;
  provider: IntegrationProvider;
  isConfigured(): boolean;
};
