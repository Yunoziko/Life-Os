"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest?.slice(0, 12).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong.</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {reference ? `Something went wrong. Reference: ${reference}` : "Try again, and if it persists, restart the session."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
