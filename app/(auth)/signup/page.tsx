import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/config";

export const metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          One account. The rest of LifeOS grows from here.
        </p>
      </div>
      <SignupForm googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
