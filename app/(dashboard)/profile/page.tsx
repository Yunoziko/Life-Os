import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="Profile"
        description="How AZIO addresses you across the workspace."
      />
      <SettingsNav current="profile" />
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <ProfileForm
          email={user.email}
          displayName={user.profile?.displayName ?? user.name ?? ""}
          timezone={user.profile?.timezone ?? "UTC"}
          bio={user.profile?.bio ?? ""}
        />
      </div>
    </div>
  );
}
