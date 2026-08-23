import { Sparkles } from "lucide-react";
import { ModulePage } from "@/components/shared/module-page";

export const metadata = { title: "AI Assistant" };

export default function AIPage() {
  return (
    <ModulePage
      title="AI Assistant"
      description="A private thinking partner, wired in when a provider is connected."
      icon={Sparkles}
      emptyTitle="The assistant is ready to be connected"
      emptyDescription="Conversations and messages already have a home in the database. No model is attached in this phase, so nothing here pretends to think."
      isEmpty
    />
  );
}
