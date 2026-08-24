import { requireUser } from "@/lib/auth/session";
import { isAIConfigured } from "@/lib/ai";
import { listConversations } from "@/lib/db/ai";
import { greetingForHour, firstName } from "@/lib/utils/greeting";
import { AIWorkspace } from "@/components/ai/ai-workspace";

export const metadata = { title: "AZIO AI" };

export default async function AIPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const user = await requireUser();
  const { prompt } = await searchParams;
  const timezone = user.profile?.timezone ?? "UTC";
  const conversations = await listConversations(user.id);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
  const name = firstName(user.profile?.displayName ?? user.name);
  const greeting = greetingForHour(Number.isFinite(hour) ? hour : new Date().getHours());

  return (
    <AIWorkspace
      key="new"
      conversations={conversations}
      greeting={name ? `${greeting}, ${name}` : greeting}
      initialPrompt={prompt?.trim() || undefined}
      configured={isAIConfigured()}
      timeZone={timezone}
    />
  );
}
