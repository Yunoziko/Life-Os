import Link from "next/link";
import { SectionCard } from "@/components/dashboard/section-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publicStepLabel } from "@/lib/agents/permissions";

export function AzioActivity({
  items,
}: {
  items: { id: string; tool: string; action: string; status: string; timestamp: Date }[];
}) {
  return (
    <SectionCard
      title="AZIO Activity"
      action={
        <Link href="/automations" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          View activity
        </Link>
      }
    >
      {!items.length ? (
        <p className="text-sm text-muted-foreground">AZIO hasn’t taken any actions yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              {item.status === "completed" ? "✓ " : item.status === "failed" ? "! " : ""}
              {item.action || publicStepLabel(item.tool)}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
