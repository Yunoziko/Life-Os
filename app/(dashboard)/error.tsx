"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-semibold tracking-tight">This view couldn’t load.</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Check your database connection, then try again.
      </p>
      <Button className="mt-5" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
