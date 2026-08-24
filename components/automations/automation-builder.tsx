"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/shared/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createAutomationAction } from "@/lib/actions/automations";
import { useMediaQuery } from "@/hooks/use-media-query";

export function AutomationBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const mobile = useMediaQuery("(max-width: 640px)");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [triggerType, setTriggerType] = useState("SCHEDULE");

  const form = (
    <form
      className="space-y-5"
      action={(formData) => {
        setError(null);
        start(async () => {
          const result = await createAutomationAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onOpenChange(false);
          if (result.data?.id) router.push(`/automations/${result.data.id}`);
        });
      }}
    >
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">When</p>
      <div className="space-y-2">
        <Label htmlFor="triggerType">Trigger</Label>
        <NativeSelect id="triggerType" name="triggerType" value={triggerType} onChange={(event) => setTriggerType(event.target.value)}>
          <option value="SCHEDULE">On a schedule</option>
          <option value="EVENT">When something happens</option>
          <option value="MANUAL">Manual only</option>
        </NativeSelect>
      </div>
      {triggerType === "SCHEDULE" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="frequency">Repeat</Label>
            <NativeSelect id="frequency" name="frequency" defaultValue="DAILY">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" name="time" type="time" defaultValue="08:00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekday">Day</Label>
            <NativeSelect id="weekday" name="weekday" defaultValue="1">
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </NativeSelect>
          </div>
        </div>
      ) : null}
      {triggerType === "EVENT" ? (
        <div className="space-y-2">
          <Label htmlFor="eventType">Event</Label>
          <NativeSelect id="eventType" name="eventType" defaultValue="PROJECT_CREATED">
            <option value="PROJECT_CREATED">I create a project</option>
            <option value="TASK_COMPLETED">I complete a task</option>
            <option value="HABIT_COMPLETED">I complete a habit</option>
            <option value="GOAL_COMPLETED">I complete a goal</option>
          </NativeSelect>
        </div>
      ) : null}

      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Do</p>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Morning planning" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="objective">Action</Label>
        <Input id="objective" name="objective" placeholder="Generate my daily brief" required />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Create automation"}
      </Button>
    </form>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={mobile ? "bottom" : "right"} className={mobile ? "rounded-t-3xl pb-8" : "w-full max-w-md"}>
        <SheetHeader>
          <SheetTitle>New automation</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">{form}</div>
      </SheetContent>
    </Sheet>
  );
}
