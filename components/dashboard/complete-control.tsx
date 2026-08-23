"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { completeTaskAction, toggleHabitAction } from "@/lib/actions/entities";
import { cn } from "@/lib/utils";

export function CompleteControl({
  id,
  done,
  kind,
  label,
}: {
  id: string;
  done: boolean;
  kind: "task" | "habit";
  label: string;
}) {
  const router = useRouter();
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={optimisticDone ? `Mark ${label} as not done` : `Complete ${label}`}
      aria-pressed={optimisticDone}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          setOptimisticDone(!done);
          const result =
            kind === "task" ? await completeTaskAction(id) : await toggleHabitAction(id);
          if (!result.ok) {
            toast.error(result.error);
          }
          router.refresh();
        });
      }}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        optimisticDone
          ? "scale-95 border-foreground bg-foreground text-background"
          : "border-border text-transparent hover:border-foreground/40"
      )}
    >
      <Check className="size-3" />
    </button>
  );
}
