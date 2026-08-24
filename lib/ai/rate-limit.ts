import { getCache } from "@/lib/cache/redis";
import { AIError } from "@/lib/ai/errors";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 20;

/**
 * Per-user AI request limiter.
 * Uses the shared CacheStore (in-memory today, Redis when REDIS_URL is set).
 */
export async function assertAIRateLimit(userId: string) {
  const cache = getCache();
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ai:rl:${userId}:${bucket}`;
  const used = (await cache.get<number>(key)) ?? 0;

  if (used >= MAX_REQUESTS) {
    throw new AIError("rate_limit");
  }

  await cache.set(key, used + 1, WINDOW_SECONDS * 2);
}
