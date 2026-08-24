import { getCache } from "@/lib/cache/redis";
import { searchGmail, type GmailMessage } from "@/lib/integrations/google/client";
import { isIntegrationConnected } from "@/lib/integrations/accounts";
import { IntegrationError } from "@/lib/integrations/errors";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export async function searchGmailSafe(userId: string, query: string): Promise<GmailMessage[]> {
  if (!(await isIntegrationConnected(userId, "GMAIL"))) {
    throw new IntegrationError(
      "not_connected",
      "I don’t have access to your Gmail yet. Connect Gmail in Settings → Integrations."
    );
  }

  const trimmed = query.trim().slice(0, 200);
  if (trimmed.length < 2) {
    throw new IntegrationError("permission", "Give AZIO a search to look for in Gmail.");
  }

  try {
    await assertRateLimit("gmail", userId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new IntegrationError("rate_limit", "Gmail search is paused for a moment. Try again shortly.");
    }
    throw error;
  }

  const cache = getCache();
  const key = `gmail:${userId}:${trimmed.toLowerCase()}`;
  const hit = await cache.get<GmailMessage[]>(key);
  if (hit) return hit;

  const results = await searchGmail(userId, trimmed);
  await cache.set(key, results, 60);
  return results;
}
