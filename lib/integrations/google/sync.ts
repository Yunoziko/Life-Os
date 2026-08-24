import { prisma } from "@/lib/db/prisma";
import { getCache } from "@/lib/cache/redis";
import {
  getIntegrationAccount,
  isIntegrationConnected,
  markIntegrationError,
  touchIntegrationSync,
} from "@/lib/integrations/accounts";
import { IntegrationError } from "@/lib/integrations/errors";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  listGoogleEvents,
  updateGoogleEvent,
  type GoogleCalendarEvent,
} from "@/lib/integrations/google/client";
import { addCalendarDays, utcMidnightFromCalendarDate, zonedDayRange } from "@/lib/utils/date";

function parseGoogleTimes(event: GoogleCalendarEvent) {
  if (event.start?.date) {
    const startAt = new Date(`${event.start.date}T00:00:00.000Z`);
    const exclusiveEnd = event.end?.date ? new Date(`${event.end.date}T00:00:00.000Z`) : new Date(startAt.getTime() + 86_400_000);
    return {
      startAt,
      endAt: new Date(exclusiveEnd.getTime() - 60_000),
      allDay: true,
    };
  }

  const startAt = new Date(event.start?.dateTime ?? "");
  const endAt = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  return { startAt, endAt, allDay: false };
}

export async function importGoogleEvents(userId: string, timeZone = "UTC") {
  const account = await getIntegrationAccount(userId, "GOOGLE_CALENDAR");
  if (!account || account.status !== "CONNECTED" || !account.accessTokenEncrypted) {
    throw new IntegrationError(
      "not_connected",
      "I don’t have access to your Google Calendar yet. Connect it in Settings → Integrations."
    );
  }

  const today = zonedDayRange(timeZone);
  const start = utcMidnightFromCalendarDate(addCalendarDays(today.ymd, -7));
  const end = utcMidnightFromCalendarDate(addCalendarDays(today.ymd, 31));
  const remote = await listGoogleEvents(userId, start, end);
  const mappings = await prisma.externalItemMapping.findMany({
    where: { userId, provider: "GOOGLE_CALENDAR" },
  });
  const byExternal = new Map(mappings.map((row) => [row.externalId, row]));
  let imported = 0;
  let updated = 0;

  for (const item of remote) {
    const times = parseGoogleTimes(item);
    if (Number.isNaN(times.startAt.getTime())) continue;

    const existing = byExternal.get(item.id);
    if (existing?.origin === "PUSHED") {
      continue;
    }

    const payload = {
      title: item.summary?.trim() || "(busy)",
      description: item.description ?? null,
      location: item.location ?? null,
      startAt: times.startAt,
      endAt: times.endAt,
      allDay: times.allDay,
      source: "GOOGLE" as const,
    };

    if (existing?.lifeOSEventId) {
      const owned = await prisma.calendarEvent.findFirst({
        where: { id: existing.lifeOSEventId, userId },
        select: { id: true },
      });
      if (owned) {
        await prisma.calendarEvent.update({
          where: { id: owned.id },
          data: payload,
        });
        await prisma.externalItemMapping.update({
          where: { id: existing.id },
          data: { etag: item.etag ?? null, calendarId: "primary" },
        });
        updated += 1;
        continue;
      }
    }

    const created = await prisma.calendarEvent.create({
      data: { userId, ...payload },
      select: { id: true },
    });
    await prisma.externalItemMapping.upsert({
      where: {
        userId_provider_externalId: {
          userId,
          provider: "GOOGLE_CALENDAR",
          externalId: item.id,
        },
      },
      create: {
        userId,
        integrationId: account.id,
        provider: "GOOGLE_CALENDAR",
        externalId: item.id,
        calendarId: "primary",
        lifeOSEventId: created.id,
        origin: "IMPORTED",
        etag: item.etag ?? null,
      },
      update: {
        lifeOSEventId: created.id,
        origin: "IMPORTED",
        etag: item.etag ?? null,
        integrationId: account.id,
      },
    });
    imported += 1;
  }

  await touchIntegrationSync(userId, "GOOGLE_CALENDAR");
  return { imported, updated, scanned: remote.length };
}

export async function pushLifeOSEventToGoogle(userId: string, eventId: string) {
  const connected = await isIntegrationConnected(userId, "GOOGLE_CALENDAR");
  if (!connected) return;

  const event = await prisma.calendarEvent.findFirst({
    where: { id: eventId, userId },
    include: { externalMap: true },
  });
  if (!event) return;
  if (event.source === "TASK" || event.source === "GOAL") return;

  const input = {
    title: event.title,
    description: event.description,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
  };

  if (event.externalMap?.externalId) {
    const remote = await updateGoogleEvent(userId, event.externalMap.externalId, input);
    await prisma.externalItemMapping.update({
      where: { id: event.externalMap.id },
      data: { etag: remote.etag ?? null },
    });
    return;
  }

  const account = await getIntegrationAccount(userId, "GOOGLE_CALENDAR");
  if (!account) return;

  const remote = await createGoogleEvent(userId, input);
  if (!remote.id) return;

  await prisma.externalItemMapping.create({
    data: {
      userId,
      integrationId: account.id,
      provider: "GOOGLE_CALENDAR",
      externalId: remote.id,
      calendarId: "primary",
      lifeOSEventId: event.id,
      origin: "PUSHED",
      etag: remote.etag ?? null,
    },
  });
}

export async function deleteSyncedGoogleEvent(userId: string, eventId: string) {
  const mapping = await prisma.externalItemMapping.findFirst({
    where: { userId, lifeOSEventId: eventId, provider: "GOOGLE_CALENDAR" },
  });
  if (!mapping) return;
  if (mapping.origin !== "PUSHED") {
    await prisma.externalItemMapping.delete({ where: { id: mapping.id } });
    return;
  }
  if (await isIntegrationConnected(userId, "GOOGLE_CALENDAR")) {
    try {
      await deleteGoogleEvent(userId, mapping.externalId);
    } catch (error) {
      if (!(error instanceof IntegrationError && error.code === "not_connected")) {
        throw error;
      }
    }
  }
  await prisma.externalItemMapping.delete({ where: { id: mapping.id } });
}

export async function maybePushLifeOSEvent(userId: string, eventId: string) {
  try {
    await pushLifeOSEventToGoogle(userId, eventId);
  } catch (error) {
    if (error instanceof IntegrationError) {
      if (error.code === "expired" || error.code === "permission") {
        await markIntegrationError(userId, "GOOGLE_CALENDAR", error.message);
      }
      return;
    }
  }
}

export async function syncGoogleCalendar(userId: string, timeZone = "UTC") {
  return importGoogleEvents(userId, timeZone);
}

export async function ensureRecentCalendarSync(userId: string, timeZone = "UTC") {
  if (!(await isIntegrationConnected(userId, "GOOGLE_CALENDAR"))) return;
  const cache = getCache();
  const key = `sync:gcal:${userId}`;
  if (await cache.get(key)) return;
  try {
    await importGoogleEvents(userId, timeZone);
    await cache.set(key, true, 300);
  } catch (error) {
    if (error instanceof IntegrationError && error.code === "not_connected") return;
    throw error;
  }
}
