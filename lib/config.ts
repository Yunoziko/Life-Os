export const PRODUCTION_ORIGIN = "https://azio.fun";
export const PRODUCTION_WWW_ORIGIN = "https://www.azio.fun";

function trimOrigin(value: string | undefined) {
  return value?.trim().replace(/\/$/, "") || "";
}

export function resolveAppUrl() {
  const fromEnv =
    trimOrigin(process.env.AUTH_URL) ||
    trimOrigin(process.env.NEXTAUTH_URL) ||
    trimOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;
  return "http://localhost:3000";
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "AZIO",
  url: resolveAppUrl(),
} as const;

export function isGoogleAuthEnabled() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
