"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reference = error.digest?.slice(0, 12).toUpperCase();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-semibold tracking-tight">This view couldn’t load.</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {reference ? `Something went wrong. Reference: ${reference}` : "Try again in a moment."}
      </p>
      <Button className="mt-5" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
