"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelSubscriptionAction, syncSubscriptionAction } from "@/lib/actions/billing";

export function ManageBilling({ cancelScheduled }: { cancelScheduled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"sync" | "cancel" | null>(null);

  async function onSync() {
    setPending("sync");
    const result = await syncSubscriptionAction();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Billing status refreshed.");
    router.refresh();
  }

  async function onCancel() {
    if (!window.confirm("Cancel Pro at the end of the current billing period? You’ll keep access until then.")) {
      return;
    }
    setPending("cancel");
    const result = await cancelSubscriptionAction();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Pro will end after the current period.");
    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => void onSync()}>
        {pending === "sync" ? "Refreshing…" : "Manage subscription"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending !== null || cancelScheduled}
        onClick={() => void onCancel()}
      >
        {cancelScheduled ? "Cancellation scheduled" : pending === "cancel" ? "Cancelling…" : "Cancel subscription"}
      </Button>
    </div>
  );
}
