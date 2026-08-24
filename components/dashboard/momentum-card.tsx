import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MomentumCard({
  score,
  delta,
  insight,
}: {
  score: number | null;
  delta: number | null;
  insight: string;
}) {
  return (
    <SectionCard title="Your Momentum">
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{score === null ? "—" : score}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {delta === null
          ? "No previous week to compare yet."
          : delta === 0
            ? "Unchanged from last week."
            : delta > 0
              ? `Up ${delta} from last week.`
              : `Down ${Math.abs(delta)} from last week.`}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{insight}</p>
      <Link href="/analytics" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
        View analytics
      </Link>
    </SectionCard>
  );
}
