"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startProCheckoutAction } from "@/lib/actions/billing";
import { openRazorpayCheckout } from "@/components/billing/razorpay-checkout";
import type { BillingIntervalId } from "@/lib/billing/config";

export function UpgradeButton({
  interval = "MONTHLY",
  label = "Upgrade to Pro",
  size = "default",
  variant = "default",
  className,
}: {
  interval?: BillingIntervalId;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onUpgrade() {
    setPending(true);
    const result = await startProCheckoutAction(interval);
    setPending(false);
    if (!result.ok || !result.data) {
      toast.error(result.ok ? "Could not start checkout." : result.error);
      return;
    }
    await openRazorpayCheckout(result.data, () => {
      router.push("/settings/billing?checkout=pending");
      router.refresh();
    });
  }

  return (
    <Button type="button" size={size} variant={variant} className={className} disabled={pending} onClick={() => void onUpgrade()}>
      {pending ? "Starting checkout…" : label}
    </Button>
  );
}
