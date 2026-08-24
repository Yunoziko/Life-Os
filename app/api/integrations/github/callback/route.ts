import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { consumeOAuthState } from "@/lib/integrations/oauth-state";
import { exchangeGitHubCode } from "@/lib/integrations/github/oauth";
import { upsertIntegrationAccount } from "@/lib/integrations/accounts";
import { integrationsSettingsUrl, loginRedirect } from "@/lib/integrations/redirect";
import { IntegrationError } from "@/lib/integrations/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(loginRedirect("/settings/integrations"));
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error === "access_denied") {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "GitHub connection was cancelled." }));
  }
  if (error) {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "GitHub didn’t complete the connection." }));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  if (!code) {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "GitHub didn’t return an authorization code." }));
  }

  const parsed = await consumeOAuthState(state);
  if (!parsed || parsed.userId !== session.user.id || parsed.slug !== "github") {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "That GitHub connection expired. Try again." }));
  }

  try {
    const tokens = await exchangeGitHubCode(code);
    await upsertIntegrationAccount(parsed.userId, "GITHUB", tokens);
    return NextResponse.redirect(integrationsSettingsUrl({ connected: "github" }));
  } catch (caught) {
    const message =
      caught instanceof IntegrationError ? caught.message : "GitHub didn’t complete the connection.";
    return NextResponse.redirect(integrationsSettingsUrl({ error: message }));
  }
}
