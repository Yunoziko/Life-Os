import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">This page isn’t here.</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        The route may have moved, or it hasn’t been built yet.
      </p>
      <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
        Back to AZIO
      </Link>
    </div>
  );
}
