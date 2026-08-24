import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/config";
import { safeInternalPath } from "@/lib/security/http";

export const metadata = {
  title: "Sign in to AZIO",
  description: "Sign in to AZIO to manage tasks, goals, projects, habits, notes, and calendar.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to AZIO</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Sign in to AZIO. Your life, organized intelligently.
        </p>
      </div>
      <LoginForm callbackUrl={safeInternalPath(callbackUrl, "/dashboard")} googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
