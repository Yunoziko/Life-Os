"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { ConversationList } from "@/components/ai/conversation-list";
import { MessageThread } from "@/components/ai/message-thread";
import { AIComposer } from "@/components/ai/composer";
import { ContextIndicator } from "@/components/ai/context-indicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  SUGGESTED_PROMPTS,
  type ChatStreamEvent,
  type ContextSource,
  type ConversationMessage,
  type ConversationSummary,
  type StructuredAction,
} from "@/lib/ai/types";

export function AIWorkspace({
  conversations,
  activeId,
  initialMessages,
  initialTitle,
  greeting,
  initialPrompt,
  configured,
  timeZone,
}: {
  conversations: ConversationSummary[];
  activeId?: string;
  initialMessages?: ConversationMessage[];
  initialTitle?: string;
  greeting: string;
  initialPrompt?: string;
  configured: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages ?? []);
  const [conversationId, setConversationId] = useState(activeId);
  const [title, setTitle] = useState(initialTitle ?? "AZIO AI");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [pendingActions, setPendingActions] = useState<StructuredAction[]>([]);
  const lastPrompt = useRef<string | null>(null);
  const autoSent = useRef(false);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;

    lastPrompt.current = message;
    setDraft("");
    setError(null);
    setThinking(true);
    setStreaming("");
    setPendingActions([]);
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });

      if (!response.body) {
        throw new Error("empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let nextId = conversationId;
      let assembled = "";

      const handle = (event: ChatStreamEvent) => {
        if (event.type === "status") {
          setThinking(true);
          setStreaming("");
          return;
        }
        if (event.type === "conversation") {
          nextId = event.id;
          setConversationId(event.id);
          setTitle(event.title);
          return;
        }
        if (event.type === "context") {
          setSources(event.sources);
          return;
        }
        if (event.type === "text") {
          setThinking(false);
          assembled += event.delta;
          setStreaming(assembled);
          return;
        }
        if (event.type === "action") {
          setPendingActions((current) => [...current, event.action]);
          return;
        }
        if (event.type === "error") {
          setThinking(false);
          setStreaming("");
          setError(event.error);
          return;
        }
        if (event.type === "done") {
          setThinking(false);
          setStreaming("");
          setMessages((current) =>
            current.some((item) => item.id === event.message.id)
              ? current
              : [...current, event.message]
          );
          setPendingActions([]);
          if (!activeId && event.conversationId) {
            router.replace(`/ai/${event.conversationId}`);
          }
          router.refresh();
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handle(JSON.parse(line) as ChatStreamEvent);
        }
      }
      if (buffer.trim()) {
        handle(JSON.parse(buffer) as ChatStreamEvent);
      }
      void nextId;
    } catch {
      setThinking(false);
      setStreaming("");
      setError("The assistant is unavailable right now. Try again.");
    }
  };

  useEffect(() => {
    if (!initialPrompt || autoSent.current) return;
    autoSent.current = true;
    void send(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once from the query string
  }, [initialPrompt]);

  const empty = messages.length === 0 && !thinking && !streaming && !error;

  return (
    <div className="-mx-4 -mb-24 -mt-6 flex h-[calc(100dvh-3.5rem-4.75rem)] min-h-[28rem] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-mb-10 lg:h-[calc(100dvh-3.5rem)]">
      <aside className="hidden w-64 shrink-0 border-r border-border/70 lg:block">
        <ConversationList conversations={conversations} activeId={conversationId} timeZone={timeZone} />
      </aside>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            timeZone={timeZone}
            onNavigate={() => setHistoryOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="mt-0.5 lg:hidden"
              aria-label="Open conversations"
              onClick={() => setHistoryOpen(true)}
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">AZIO AI</h1>
              <p className="text-sm text-muted-foreground">
                AZIO understands your work, goals and routines.
              </p>
            </div>
          </div>
          <ContextIndicator sources={sources} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          {empty ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-10">
              <p className="text-3xl font-semibold tracking-tight">{greeting}.</p>
              <p className="mt-2 text-muted-foreground">Ask AZIO what you’d like to accomplish today.</p>
              {!configured ? (
                <p className="mt-4 max-w-md text-sm text-muted-foreground">
                  The assistant is ready. Add an API key on the server to start talking with your workspace.
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-border/80 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
                    onClick={() => void send(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageThread
              messages={messages}
              streaming={streaming}
              thinking={thinking && !streaming}
              pendingActions={pendingActions}
              error={error}
              onRetry={() => lastPrompt.current && void send(lastPrompt.current)}
              timeZone={timeZone}
              onActionResolved={(messageId, action) => {
                setMessages((current) =>
                  current.map((message) =>
                    message.id === messageId
                      ? {
                          ...message,
                          metadata: {
                            ...message.metadata,
                            actions: (message.metadata?.actions ?? []).map((item) =>
                              item.id === action.id ? action : item
                            ),
                          },
                        }
                      : message
                  )
                );
              }}
            />
          )}
        </div>

        <div className="px-4 pt-2 pb-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <AIComposer
              value={draft}
              onChange={setDraft}
              disabled={thinking}
              onSubmit={() => void send(draft)}
            />
            {title && conversationId ? (
              <p className="mt-2 truncate px-1 text-[11px] text-muted-foreground">{title}</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
