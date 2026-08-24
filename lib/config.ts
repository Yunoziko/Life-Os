export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "AZIO",
  url: process.env.AUTH_URL ?? "http://localhost:3000",
} as const;

export function isGoogleAuthEnabled() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
