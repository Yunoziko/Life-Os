import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-[13px] font-semibold tracking-tight text-background">
        A
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">AZIO</span>
      )}
    </Link>
  );
}
