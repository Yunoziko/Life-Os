import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { IntegrationsPanel } from "@/components/integrations/integrations-panel";
import { listPublicIntegrations } from "@/lib/integrations/accounts";
import { googleCalendarProvider, gmailProvider } from "@/lib/integrations/google/provider";
import { githubProvider } from "@/lib/integrations/github/provider";
import type { IntegrationSlug } from "@/lib/integrations/types";

export const metadata = { title: "Integrations" };

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const integrations = await listPublicIntegrations(user.id);
  const connected = integrations.some((item) => item.slug === params.connected)
    ? (params.connected as IntegrationSlug)
    : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect the accounts LifeOS should read from. You can disconnect at any time."
      />

      <section className="rounded-2xl border border-border/70 bg-muted/30 p-5">
        <p className="text-sm leading-6 text-muted-foreground">
          LifeOS only accesses data required for the features you enable. Tokens stay on the server
          and are never sent to the browser. Google Calendar can read and write events; Gmail is
          read-only; GitHub is read-only.
        </p>
      </section>

      <IntegrationsPanel
        integrations={integrations}
        googleConfigured={googleCalendarProvider.isConfigured() && gmailProvider.isConfigured()}
        githubConfigured={githubProvider.isConfigured()}
        connected={connected}
        error={params.error}
        notice={params.notice}
      />
    </div>
  );
}
