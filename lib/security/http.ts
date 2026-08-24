import { timingSafeEqual } from "node:crypto";
import { appConfig } from "@/lib/config";

export function createRequestId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
}

export function safeInternalPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("://") || path.includes("\\")) return fallback;
  return path;
}

export function appOrigin() {
  return appConfig.url.replace(/\/$/, "");
}

export function isTrustedOrigin(origin: string | null) {
  if (!origin) return true;
  const allowed = new Set([appOrigin(), "http://localhost:3000", "http://127.0.0.1:3000"]);
  const extra = process.env.ALLOWED_ORIGINS?.split(",").map((item) => item.trim().replace(/\/$/, "")).filter(Boolean);
  for (const item of extra ?? []) allowed.add(item);
  return allowed.has(origin.replace(/\/$/, ""));
}

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!isTrustedOrigin(origin)) {
    const error = new Error("Cross-origin request blocked.");
    error.name = "OriginError";
    throw error;
  }
}

export function bearerMatches(header: string | null, secret: string) {
  if (!header || !secret) return false;
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(header);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isCronAuthorized(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return env.NODE_ENV !== "production";
  return bearerMatches(request.headers.get("authorization"), secret);
}

export function isWorkerHealthAuthorized(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const secret = env.CRON_SECRET?.trim() || env.WORKER_HEALTH_SECRET?.trim();
  if (!secret) return env.NODE_ENV !== "production";
  return bearerMatches(request.headers.get("authorization"), secret);
}

export function ownedWhere(userId: string, id: string) {
  return { id, userId };
}
