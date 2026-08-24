import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.96_0.01_85),transparent_42%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.22_0.015_70),transparent_40%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/pricing" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Pricing
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="mb-5 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Personal operating system
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          A calmer way to run your life.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
          Tasks, goals, notes, and habits in one quiet workspace — built to feel as considered as
          the tools you already trust.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "min-w-40")}>
            Get started
          </Link>
          <Link
            href="/pricing"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-40")}
          >
            View pricing
          </Link>
        </div>
      </main>
    </div>
  );
}
