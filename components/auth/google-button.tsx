"use client";

import { useState } from "react";
import { googleSignInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function GoogleButton({ callbackUrl }: { callbackUrl?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 w-full"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void googleSignInAction(callbackUrl);
      }}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.35 11.1h-9.18v2.96h5.27c-.23 1.5-1.77 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.99 4.2 14.86 3.3 12.17 3.3 6.99 3.3 2.8 7.5 2.8 12.61s4.19 9.31 9.37 9.31c5.41 0 8.98-3.8 8.98-9.15 0-.62-.07-1.08-.2-1.67Z"
        />
      </svg>
      {pending ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
