import { getCache } from "@/lib/cache/redis";
import { searchGmail, type GmailMessage } from "@/lib/integrations/google/client";
import { isIntegrationConnected } from "@/lib/integrations/accounts";
import { IntegrationError } from "@/lib/integrations/errors";

export async function searchGmailSafe(userId: string, query: string): Promise<GmailMessage[]> {
  if (!(await isIntegrationConnected(userId, "GMAIL"))) {
    throw new IntegrationError(
      "not_connected",
      "I don’t have access to your Gmail yet. Connect Gmail in Settings → Integrations."
    );
  }

  const trimmed = query.trim().slice(0, 200);
  if (trimmed.length < 2) {
    throw new IntegrationError("permission", "Give LifeOS a search to look for in Gmail.");
  }

  const cache = getCache();
  const key = `gmail:${userId}:${trimmed.toLowerCase()}`;
  const hit = await cache.get<GmailMessage[]>(key);
  if (hit) return hit;

  const results = await searchGmail(userId, trimmed);
  await cache.set(key, results, 60);
  return results;
}
