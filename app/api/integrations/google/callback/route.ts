import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { consumeOAuthState } from "@/lib/integrations/oauth-state";
import { exchangeGoogleCode } from "@/lib/integrations/google/oauth";
import { upsertIntegrationAccount } from "@/lib/integrations/accounts";
import { importGoogleEvents } from "@/lib/integrations/google/sync";
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
    return NextResponse.redirect(integrationsSettingsUrl({ error: "Google connection was cancelled." }));
  }
  if (error) {
    return NextResponse.redirect(
      integrationsSettingsUrl({ error: "Google didn’t complete the connection." })
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  if (!code) {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "Google didn’t return an authorization code." }));
  }

  const parsed = await consumeOAuthState(state);
  if (!parsed || parsed.userId !== session.user.id || (parsed.slug !== "google-calendar" && parsed.slug !== "gmail")) {
    return NextResponse.redirect(integrationsSettingsUrl({ error: "That Google connection expired. Try again." }));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await upsertIntegrationAccount(
      parsed.userId,
      parsed.slug === "gmail" ? "GMAIL" : "GOOGLE_CALENDAR",
      tokens
    );

    if (parsed.slug === "google-calendar") {
      try {
        await importGoogleEvents(parsed.userId);
      } catch {
        // Connection succeeded; sync can be retried from Settings.
      }
    }

    return NextResponse.redirect(integrationsSettingsUrl({ connected: parsed.slug }));
  } catch (caught) {
    const message =
      caught instanceof IntegrationError
        ? caught.message
        : "Google didn’t complete the connection.";
    return NextResponse.redirect(integrationsSettingsUrl({ error: message }));
  }
}
