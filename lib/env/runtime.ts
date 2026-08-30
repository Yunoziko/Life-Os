/**
 * Read a server env var at runtime.
 * `process.env.NAME` can be inlined at `next build`; Vercel Sensitive
 * values are not available then, so Auth.js/Prisma would see empty strings.
 */
export function runtimeEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
