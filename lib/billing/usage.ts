import { prisma } from "@/lib/db/prisma";
import { calendarDate, utcMidnightFromCalendarDate } from "@/lib/utils/date";

export function monthPeriod(timeZone = "UTC", date = new Date()) {
  const today = calendarDate(timeZone, date);
  const [year, month] = today.split("-").map(Number);
  const startYmd = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endYmd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return {
    start: utcMidnightFromCalendarDate(startYmd),
    end: utcMidnightFromCalendarDate(endYmd),
    startYmd,
    endYmd,
  };
}

export async function getAIUsageCount(userId: string, timeZone = "UTC") {
  const period = monthPeriod(timeZone);
  const row = await prisma.aIUsage.findUnique({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    select: { messageCount: true },
  });
  return row?.messageCount ?? 0;
}

export async function recordAIUsage(userId: string, timeZone = "UTC") {
  const period = monthPeriod(timeZone);
  await prisma.aIUsage.upsert({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    create: {
      userId,
      periodStart: period.start,
      periodEnd: period.end,
      messageCount: 1,
    },
    update: { messageCount: { increment: 1 }, periodEnd: period.end },
  });
}
