import { getCache } from "@/lib/cache/redis";
import { calendarDate } from "@/lib/utils/date";
import { MAX_AUTOMATION_RUNS_PER_DAY, MAX_AUTOMATIONS_PER_USER } from "@/lib/agents/types";

export async function assertAutomationRunBudget(userId: string, timeZone: string) {
  const cache = getCache();
  const key = `automation:runs:${userId}:${calendarDate(timeZone)}`;
  const used = (await cache.get<number>(key)) ?? 0;
  if (used >= MAX_AUTOMATION_RUNS_PER_DAY) {
    throw new Error("AZIO paused automations for today to protect against repeated runs.");
  }
  await cache.set(key, used + 1, 60 * 60 * 36);
}

export { MAX_AUTOMATIONS_PER_USER };
