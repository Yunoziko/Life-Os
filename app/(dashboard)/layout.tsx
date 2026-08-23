import { requireUser } from "@/lib/auth/session";
import { getAssignableOptions } from "@/lib/db/tasks";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [projects, goals] = await getAssignableOptions(user.id);

  return (
    <AppShell
      user={{
        name: user.profile?.displayName ?? user.name,
        email: user.email,
        image: user.image,
      }}
      projects={projects}
      goals={goals}
    >
      {children}
    </AppShell>
  );
}
