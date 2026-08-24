import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeOAuthState } from "@/lib/integrations/oauth-state";
import { googleAuthorizeUrl, googleOAuthConfigured } from "@/lib/integrations/google/oauth";
import { loginRedirect, oauthErrorRedirect, integrationsSettingsUrl } from "@/lib/integrations/redirect";
import { IntegrationError } from "@/lib/integrations/errors";
import { assertCanConnectIntegration, integrationUpgradeRedirect, isUpgradeError } from "@/lib/billing/integrations-guard";
import type { IntegrationSlug } from "@/lib/integrations/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(loginRedirect("/settings/integrations"));
  }

  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(
      integrationsSettingsUrl({
        error: "Google OAuth isn’t configured on the server yet.",
      })
    );
  }

  const kind = request.nextUrl.searchParams.get("provider") === "gmail" ? "gmail" : "calendar";
  const slug: IntegrationSlug = kind === "gmail" ? "gmail" : "google-calendar";

  try {
    await assertCanConnectIntegration(session.user.id, slug);
    const state = await writeOAuthState(session.user.id, slug);
    return NextResponse.redirect(googleAuthorizeUrl(state, kind));
  } catch (error) {
    if (isUpgradeError(error)) return integrationUpgradeRedirect(request.nextUrl.origin);
    if (error instanceof IntegrationError) {
      return NextResponse.redirect(integrationsSettingsUrl({ error: error.message }));
    }
    return NextResponse.redirect(oauthErrorRedirect(error));
  }
}
