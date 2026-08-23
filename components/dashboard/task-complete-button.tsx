"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { completeTaskAction } from "@/lib/actions/entities";
import { cn } from "@/lib/utils";

export function TaskCompleteButton({
  taskId,
  done,
}: {
  taskId: string;
  done: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={done ? "Mark task as open" : "Complete task"}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await completeTaskAction(taskId);
          router.refresh();
        });
      }}
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        done
          ? "border-foreground bg-foreground text-background"
          : "border-border text-transparent hover:border-foreground/40"
      )}
    >
      <Check className="size-3" />
    </button>
  );
}
