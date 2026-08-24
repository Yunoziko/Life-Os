"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AutomationBuilder } from "@/components/automations/automation-builder";
import { AutomationsView, TemplateGrid, type AutomationListItem } from "@/components/automations/automations-view";

export function AutomationsWorkspace({ items, isPro }: { items: AutomationListItem[]; isPro: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {isPro ? (
        <div className="mb-8 flex justify-end">
          <Button type="button" onClick={() => setOpen(true)}>
            + New Automation
          </Button>
        </div>
      ) : null}
      {isPro ? <div className="mb-8"><TemplateGrid /></div> : null}
      <AutomationsView items={items} isPro={isPro} builder={null} />
      {isPro ? <AutomationBuilder open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
