import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isAIConfigured } from "@/lib/ai";
import { getConversation, listConversations } from "@/lib/db/ai";
import { greetingForHour, firstName } from "@/lib/utils/greeting";
import { AIWorkspace } from "@/components/ai/ai-workspace";

export const metadata = { title: "AZIO AI" };

export default async function AIConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const timezone = user.profile?.timezone ?? "UTC";
  const [conversations, conversation] = await Promise.all([
    listConversations(user.id),
    getConversation(user.id, id),
  ]);

  if (!conversation) notFound();

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
      key={conversation.id}
      conversations={conversations}
      activeId={conversation.id}
      initialMessages={conversation.messages}
      initialTitle={conversation.title}
      greeting={name ? `${greeting}, ${name}` : greeting}
      configured={isAIConfigured()}
      timeZone={timezone}
    />
  );
}
