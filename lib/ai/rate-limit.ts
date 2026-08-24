import { AIError } from "@/lib/ai/errors";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export async function assertAIRateLimit(userId: string) {
  try {
    await assertRateLimit("ai", userId);
  } catch (error) {
    if (error instanceof RateLimitError) throw new AIError("rate_limit");
    throw error;
  }
}
