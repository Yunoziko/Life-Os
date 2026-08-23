import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardFocus } from "@/lib/db/dashboard";

export function FocusCard({ focus }: { focus: DashboardFocus | null }) {
  return (
    <SectionCard title="Today’s focus">
      {!focus ? (
        <SectionEmpty
          title="No active focus"
          description="Choose a goal and LifeOS will keep it in view."
          action={<CreateTrigger type="goal" size="sm">Create a goal</CreateTrigger>}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-[15px] font-medium tracking-tight">
              {focus.taskTitle ?? focus.goalTitle}
            </p>
            {focus.taskTitle ? (
              <p className="mt-1 text-sm text-muted-foreground">Goal: {focus.goalTitle}</p>
            ) : null}
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{focus.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/80 transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, focus.progress))}%` }}
              />
            </div>
          </div>
          <Link
            href={focus.taskId ? `/tasks/${focus.taskId}` : `/goals/${focus.goalId}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Continue
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
