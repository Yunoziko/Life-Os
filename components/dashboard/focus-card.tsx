import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionEmpty } from "@/components/dashboard/section-empty";
import { CreateTrigger } from "@/components/dashboard/create-trigger";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardFocus } from "@/lib/db/dashboard";

export function FocusCard({ focus }: { focus: DashboardFocus | null }) {
  return (
    <SectionCard title="Today’s focus">
      {!focus ? (
        <SectionEmpty
          title="No active focus"
          description="Choose a goal or project and LifeOS will keep it in view."
          action={<CreateTrigger type="goal" size="sm">Create a goal</CreateTrigger>}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-[15px] font-medium tracking-tight">
              {focus.taskTitle ?? focus.goalTitle ?? focus.projectName}
            </p>
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {focus.projectName ? <p>Project: {focus.projectName}</p> : null}
              {focus.goalTitle && focus.taskTitle ? <p>Goal: {focus.goalTitle}</p> : null}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{focus.progress}%</span>
            </div>
            <ProgressBar value={focus.progress} label="Focus progress" />
          </div>
          <Link
            href={
              focus.taskId
                ? `/tasks/${focus.taskId}`
                : focus.projectId
                  ? `/projects/${focus.projectId}`
                  : `/goals/${focus.goalId}`
            }
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Continue
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
