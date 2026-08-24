import { getAccessToken, markIntegrationError, upsertIntegrationAccount } from "@/lib/integrations/accounts";
import { IntegrationError } from "@/lib/integrations/errors";
import { refreshGoogleToken } from "@/lib/integrations/google/oauth";
import type { IntegrationProvider } from "@/generated/prisma/enums";

async function authorizedFetch(
  userId: string,
  provider: IntegrationProvider,
  url: string,
  init?: RequestInit
) {
  const account = await getAccessToken(userId, provider);
  let accessToken = account.accessToken;

  if (account.expiresAt && account.expiresAt.getTime() < Date.now() + 60_000) {
    if (!account.refreshToken) {
      await markIntegrationError(userId, provider, "This connection expired. Reconnect to continue.");
      throw new IntegrationError("expired", "This connection expired. Reconnect in Settings → Integrations.");
    }
    const refreshed = await refreshGoogleToken(account.refreshToken);
    await upsertIntegrationAccount(userId, provider, {
      ...refreshed,
      accountLabel: account.accountLabel,
      refreshToken: refreshed.refreshToken ?? account.refreshToken,
    });
    accessToken = refreshed.accessToken;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new IntegrationError("network", "LifeOS couldn’t reach Google just then.", { cause: error });
  }

  if (response.status === 401) {
    if (account.refreshToken) {
      try {
        const refreshed = await refreshGoogleToken(account.refreshToken);
        await upsertIntegrationAccount(userId, provider, {
          ...refreshed,
          accountLabel: account.accountLabel,
          refreshToken: refreshed.refreshToken ?? account.refreshToken,
        });
        return fetch(url, {
          ...init,
          headers: {
            Authorization: `Bearer ${refreshed.accessToken}`,
            ...(init?.headers ?? {}),
          },
        });
      } catch (error) {
        await markIntegrationError(userId, provider, "This connection expired. Reconnect to continue.");
        throw error;
      }
    }
    await markIntegrationError(userId, provider, "This connection expired. Reconnect to continue.");
    throw new IntegrationError("expired", "This connection expired. Reconnect in Settings → Integrations.");
  }

  if (response.status === 403) {
    throw new IntegrationError("permission", "LifeOS doesn’t have permission for that yet.");
  }
  if (response.status === 429) {
    throw new IntegrationError("rate_limit", "Google asked LifeOS to wait. Try again in a minute.");
  }
  if (!response.ok) {
    throw new IntegrationError("provider", "Google is unavailable right now.");
  }

  return response;
}

export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  etag?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export async function listGoogleEvents(userId: string, timeMin: Date, timeMax: Date) {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");
  const response = await authorizedFetch(userId, "GOOGLE_CALENDAR", url.toString());
  const json = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return (json.items ?? []).filter((item) => item.status !== "cancelled" && item.id);
}

export async function createGoogleEvent(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    location?: string | null;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
  }
) {
  const body = {
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: input.allDay
      ? { date: input.startAt.toISOString().slice(0, 10) }
      : { dateTime: input.startAt.toISOString() },
    end: input.allDay
      ? { date: (input.endAt ?? input.startAt).toISOString().slice(0, 10) }
      : { dateTime: (input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000)).toISOString() },
  };
  const response = await authorizedFetch(userId, "GOOGLE_CALENDAR", "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as GoogleCalendarEvent;
}

export async function updateGoogleEvent(
  userId: string,
  eventId: string,
  input: {
    title: string;
    description?: string | null;
    location?: string | null;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
  }
) {
  const body = {
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: input.allDay
      ? { date: input.startAt.toISOString().slice(0, 10) }
      : { dateTime: input.startAt.toISOString() },
    end: input.allDay
      ? { date: (input.endAt ?? input.startAt).toISOString().slice(0, 10) }
      : { dateTime: (input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000)).toISOString() },
  };
  const response = await authorizedFetch(
    userId,
    "GOOGLE_CALENDAR",
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return (await response.json()) as GoogleCalendarEvent;
}

export async function deleteGoogleEvent(userId: string, eventId: string) {
  await authorizedFetch(
    userId,
    "GOOGLE_CALENDAR",
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" }
  );
}

export type GmailMessage = {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
};

export async function searchGmail(userId: string, query: string): Promise<GmailMessage[]> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", "8");
  const list = await authorizedFetch(userId, "GMAIL", listUrl.toString());
  const json = (await list.json()) as { messages?: { id: string; threadId: string }[] };
  const ids = json.messages ?? [];
  const details = await Promise.all(
    ids.slice(0, 8).map(async (item) => {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`);
      url.searchParams.set("format", "metadata");
      url.searchParams.set("metadataHeaders", "From");
      url.searchParams.append("metadataHeaders", "Subject");
      url.searchParams.append("metadataHeaders", "Date");
      const response = await authorizedFetch(userId, "GMAIL", url.toString());
      const message = (await response.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const headers = new Map(
        (message.payload?.headers ?? []).map((header) => [header.name.toLowerCase(), header.value])
      );
      return {
        id: message.id,
        threadId: message.threadId,
        sender: headers.get("from") ?? "Unknown sender",
        subject: headers.get("subject") ?? "(no subject)",
        date: headers.get("date") ?? "",
        snippet: (message.snippet ?? "").slice(0, 240),
      };
    })
  );
  return details;
}
