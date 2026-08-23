import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        name: user.profile?.displayName ?? user.name,
        email: user.email,
        image: user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
