import Link from "next/link";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardInsight } from "@/types";

export function AiInsight({ insight }: { insight: DashboardInsight }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div aria-hidden="true" className="absolute inset-y-4 left-0 w-px bg-foreground/20" />
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-medium tracking-tight">AZIO Insight</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{insight.body}</p>
      <Link href="/ai?prompt=What%20should%20I%20focus%20on%20today%3F" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
        Ask AZIO →
      </Link>
    </section>
  );
}
