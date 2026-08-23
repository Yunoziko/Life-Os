import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-5 shadow-sm", className)}>
      <h2 className="mb-4 text-sm font-medium tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}
