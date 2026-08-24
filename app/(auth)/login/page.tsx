import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthEnabled } from "@/lib/config";

export const metadata = {
  title: "Sign in to AZIO",
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
      <LoginForm callbackUrl={callbackUrl} googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
