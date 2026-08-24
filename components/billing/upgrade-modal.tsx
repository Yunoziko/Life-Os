"use client";

import { PRO_BENEFITS } from "@/lib/billing/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UpgradeButton } from "@/components/billing/upgrade-button";

export function UpgradeModal({
  open,
  title,
  description,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium">Unlock LifeOS Pro</p>
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {PRO_BENEFITS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">₹499/month</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <UpgradeButton label="Upgrade to Pro" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
