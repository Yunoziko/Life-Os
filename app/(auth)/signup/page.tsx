import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/config";

export const metadata = {
  title: "Create your AZIO account",
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your AZIO account</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Your life, organized intelligently.
        </p>
      </div>
      <SignupForm googleEnabled={isGoogleAuthEnabled()} />
    </div>
  );
}
