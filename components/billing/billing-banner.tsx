import Link from "next/link";

export function BillingBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-sm text-destructive">
      {message}{" "}
      <Link href="/settings/billing" className="underline underline-offset-2">
        Resolve billing
      </Link>
    </div>
  );
}
