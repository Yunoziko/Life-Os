"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Code2, Mail } from "lucide-react";
import { toast } from "sonner";
import { disconnectIntegrationAction, syncGoogleCalendarAction } from "@/lib/actions/integrations";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { IntegrationSlug, PublicIntegration } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";
import { useUpgrade } from "@/components/billing/upgrade-provider";

const ICONS: Record<IntegrationSlug, typeof CalendarDays> = {
  "google-calendar": CalendarDays,
  gmail: Mail,
  github: Code2,
};

const START_HREF: Record<IntegrationSlug, string> = {
  "google-calendar": "/api/integrations/google/start?provider=calendar",
  gmail: "/api/integrations/google/start?provider=gmail",
  github: "/api/integrations/github/start",
};

function statusLabel(status: PublicIntegration["status"]) {
  if (status === "CONNECTED") return "Connected";
  if (status === "ERROR") return "Connection error";
  return "Not connected";
}

function formatStamp(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function IntegrationsPanel({
  integrations,
  googleConfigured,
  githubConfigured,
  notice,
  error,
  connected,
  upgrade,
}: {
  integrations: PublicIntegration[];
  googleConfigured: boolean;
  githubConfigured: boolean;
  notice?: string;
  error?: string;
  connected?: string;
  upgrade?: boolean;
}) {
  const router = useRouter();
  const { openUpgrade } = useUpgrade();
  const [pending, setPending] = useState<string | null>(null);
  const [managing, setManaging] = useState<PublicIntegration | null>(null);

  useEffect(() => {
    if (error) toast.error(error);
    if (connected) {
      const name = integrations.find((item) => item.slug === connected)?.name ?? "Integration";
      toast.success(`${name} connected.`);
    }
    if (notice) toast.message(notice);
    if (error || connected || notice) {
      router.replace("/settings/integrations");
    }
  }, [connected, error, integrations, notice, router]);

  useEffect(() => {
    if (upgrade) {
      openUpgrade("INTEGRATIONS");
      router.replace("/settings/integrations");
    }
  }, [openUpgrade, router, upgrade]);

  function configuredFor(slug: IntegrationSlug) {
    if (slug === "github") return githubConfigured;
    return googleConfigured;
  }

  async function disconnect(slug: IntegrationSlug) {
    setPending(`disconnect:${slug}`);
    const result = await disconnectIntegrationAction(slug);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Disconnected. Your AZIO data is unchanged.");
    setManaging(null);
    router.refresh();
  }

  async function syncNow() {
    setPending("sync");
    const result = await syncGoogleCalendarAction();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Synced ${result.data?.imported ?? 0} new and ${result.data?.updated ?? 0} updated events.`
    );
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-4">
        {integrations.map((item) => {
          const Icon = ICONS[item.slug];
          const configured = configuredFor(item.slug);
          const connectedState = item.status === "CONNECTED";
          const errored = item.status === "ERROR";
          return (
            <article
              key={item.slug}
              className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium">{item.name}</h2>
                    <span
                      className={
                        connectedState
                          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400"
                          : errored
                            ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive"
                            : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      }
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {errored && item.lastError ? (
                    <p className="text-xs text-destructive">{item.lastError}</p>
                  ) : null}
                  {connectedState && item.accountLabel ? (
                    <p className="text-xs text-muted-foreground">{item.accountLabel}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {!configured ? (
                  <p className="text-xs text-muted-foreground">Not configured on the server.</p>
                ) : connectedState ? (
                  <>
                    {item.slug === "google-calendar" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending !== null}
                        onClick={() => void syncNow()}
                      >
                        {pending === "sync" ? "Syncing…" : "Sync now"}
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" onClick={() => setManaging(item)}>
                      Manage
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending !== null}
                      onClick={() => void disconnect(item.slug)}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : errored ? (
                  <>
                    <Link href={START_HREF[item.slug]} className={cn(buttonVariants({ size: "sm" }))}>
                      Reconnect
                    </Link>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending !== null}
                      onClick={() => void disconnect(item.slug)}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Link href={START_HREF[item.slug]} className={cn(buttonVariants({ size: "sm" }))}>
                    Connect
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Sheet open={Boolean(managing)} onOpenChange={(open) => !open && setManaging(null)}>
        <SheetContent className="sm:max-w-md">
          {managing ? (
            <>
              <SheetHeader>
                <SheetTitle>{managing.name}</SheetTitle>
                <SheetDescription>{managing.description}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-6">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>{statusLabel(managing.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Account</dt>
                    <dd>{managing.accountLabel ?? "Connected"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Connected</dt>
                    <dd>{formatStamp(managing.connectedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd>{formatStamp(managing.lastSyncAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Permissions</dt>
                    <dd>
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                        {managing.permissions.map((permission) => (
                          <li key={permission}>{permission}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
                <p className="text-xs leading-5 text-muted-foreground">
                  AZIO only accesses data required for the features you enable. Disconnecting removes
                  access tokens. It does not delete your AZIO tasks, notes, or events.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={START_HREF[managing.slug]} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                    Reconnect
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={pending !== null}
                    onClick={() => void disconnect(managing.slug)}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
