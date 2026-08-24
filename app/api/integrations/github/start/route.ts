import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeOAuthState } from "@/lib/integrations/oauth-state";
import { githubAuthorizeUrl, githubOAuthConfigured } from "@/lib/integrations/github/oauth";
import { integrationsSettingsUrl, loginRedirect, oauthErrorRedirect } from "@/lib/integrations/redirect";
import { IntegrationError } from "@/lib/integrations/errors";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(loginRedirect("/settings/integrations"));
  }

  if (!githubOAuthConfigured()) {
    return NextResponse.redirect(
      integrationsSettingsUrl({ error: "GitHub OAuth isn’t configured on the server yet." })
    );
  }

  try {
    const state = await writeOAuthState(session.user.id, "github");
    return NextResponse.redirect(githubAuthorizeUrl(state));
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.redirect(integrationsSettingsUrl({ error: error.message }));
    }
    return NextResponse.redirect(oauthErrorRedirect(error));
  }
}
