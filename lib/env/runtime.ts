/**
 * Read server env vars with static `process.env.NAME` access where possible.
 * Dynamic `process.env[name]` lookups can miss Vercel/Next.js runtime injection
 * in some server bundles (e.g. Server Actions), while API routes still work.
 */
function trimEnv(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function runtimeEnv(name: string): string | undefined {
  switch (name) {
    case "DATABASE_URL":
      return trimEnv(process.env.DATABASE_URL);
    case "AUTH_SECRET":
      return trimEnv(process.env.AUTH_SECRET);
    case "AUTH_URL":
      return trimEnv(process.env.AUTH_URL);
    case "NEXTAUTH_URL":
      return trimEnv(process.env.NEXTAUTH_URL);
    case "NEXT_PUBLIC_APP_URL":
      return trimEnv(process.env.NEXT_PUBLIC_APP_URL);
    case "AUTH_GOOGLE_ID":
      return trimEnv(process.env.AUTH_GOOGLE_ID);
    case "AUTH_GOOGLE_SECRET":
      return trimEnv(process.env.AUTH_GOOGLE_SECRET);
    case "RAZORPAY_KEY_ID":
      return trimEnv(process.env.RAZORPAY_KEY_ID);
    case "RAZORPAY_KEY_SECRET":
      return trimEnv(process.env.RAZORPAY_KEY_SECRET);
    case "AZIO_ALLOW_LIVE_PAYMENTS":
      return trimEnv(process.env.AZIO_ALLOW_LIVE_PAYMENTS);
    default:
      return trimEnv(process.env[name]);
  }
}

export function readDatabaseUrl(): string | undefined {
  return trimEnv(process.env.DATABASE_URL);
}

export function readAuthSecret(): string | undefined {
  return trimEnv(process.env.AUTH_SECRET);
}

export function readRazorpayKeyId(): string | undefined {
  return trimEnv(process.env.RAZORPAY_KEY_ID);
}

export function readRazorpayKeySecret(): string | undefined {
  return trimEnv(process.env.RAZORPAY_KEY_SECRET);
}

export function readAzioAllowLivePayments(): string | undefined {
  return trimEnv(process.env.AZIO_ALLOW_LIVE_PAYMENTS);
}
