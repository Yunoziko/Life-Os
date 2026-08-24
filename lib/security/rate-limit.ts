import { getCache } from "@/lib/cache/redis";
import { createHash } from "node:crypto";

export type RateLimitBucket =
  | "auth.login"
  | "auth.signup"
  | "ai"
  | "agent"
  | "automation.create"
  | "automation.run"
  | "billing"
  | "gmail"
  | "github"
  | "search";

type Limit = { max: number; windowSeconds: number };

function envInt(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export const RATE_LIMITS: Record<RateLimitBucket, Limit> = {
  "auth.login": { max: envInt("RATE_LIMIT_LOGIN", 10), windowSeconds: envInt("RATE_LIMIT_LOGIN_WINDOW", 900) },
  "auth.signup": { max: envInt("RATE_LIMIT_SIGNUP", 5), windowSeconds: envInt("RATE_LIMIT_SIGNUP_WINDOW", 3600) },
  ai: { max: envInt("RATE_LIMIT_AI", 20), windowSeconds: envInt("RATE_LIMIT_AI_WINDOW", 60) },
  agent: { max: envInt("RATE_LIMIT_AGENT", 10), windowSeconds: envInt("RATE_LIMIT_AGENT_WINDOW", 60) },
  "automation.create": { max: envInt("RATE_LIMIT_AUTOMATION_CREATE", 20), windowSeconds: 3600 },
  "automation.run": { max: envInt("RATE_LIMIT_AUTOMATION_RUN", 10), windowSeconds: 60 },
  billing: { max: envInt("RATE_LIMIT_BILLING", 10), windowSeconds: 900 },
  gmail: { max: envInt("RATE_LIMIT_GMAIL", 10), windowSeconds: 60 },
  github: { max: envInt("RATE_LIMIT_GITHUB", 20), windowSeconds: 60 },
  search: { max: envInt("RATE_LIMIT_SEARCH", 30), windowSeconds: 60 },
};

export class RateLimitError extends Error {
  readonly code = "rate_limit" as const;

  constructor(message = "Too many attempts. Try again in a moment.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function consumeRateLimit(bucket: RateLimitBucket, identity: string) {
  const limit = RATE_LIMITS[bucket];
  const cache = getCache();
  const window = Math.floor(Date.now() / (limit.windowSeconds * 1000));
  const key = `rl:${bucket}:${hashRateLimitKey(identity)}:${window}`;
  const used = await cache.incr(key, limit.windowSeconds * 2);
  if (used > limit.max) {
    throw new RateLimitError();
  }
  return { used, remaining: Math.max(0, limit.max - used), limit: limit.max };
}

export async function assertRateLimit(bucket: RateLimitBucket, identity: string) {
  await consumeRateLimit(bucket, identity);
}
