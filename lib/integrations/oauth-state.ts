import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { IntegrationSlug } from "@/lib/integrations/types";

const COOKIE = "lifeos_oauth_state";
const MAX_AGE = 60 * 10;
const SLUGS = new Set<IntegrationSlug>(["google-calendar", "gmail", "github"]);

function secret() {
  return process.env.INTEGRATION_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim() || "";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function writeOAuthState(userId: string, slug: IntegrationSlug) {
  const nonce = randomBytes(16).toString("base64url");
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}:${slug}:${nonce}:${exp}`;
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function consumeOAuthState(expected: string) {
  const store = await cookies();
  const cookie = store.get(COOKIE)?.value;
  store.delete(COOKIE);
  if (!cookie || !expected || cookie !== expected) return null;

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;
  const check = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(check);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [userId, storedSlug, , exp] = payload.split(":");
  if (!userId || !storedSlug || !SLUGS.has(storedSlug as IntegrationSlug)) return null;
  if (Number(exp) < Date.now()) return null;
  return { userId, slug: storedSlug as IntegrationSlug };
}
