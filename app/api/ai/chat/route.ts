import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { runLifeOSChat, type ChatStreamEvent } from "@/lib/ai/chat";
import { AIError, userFacingAIError } from "@/lib/ai/errors";
import { aiLog, publicUserRef } from "@/lib/ai/logger";

export const runtime = "nodejs";

function encode(event: ChatStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(encode({ type: "error", error: "Please sign in to use LifeOS AI.", code: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  let body: { conversationId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(encode({ type: "error", error: "That request couldn’t be read.", code: "malformed" }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return new Response(encode({ type: "error", error: "Please sign in to use LifeOS AI.", code: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(new TextEncoder().encode(encode(event)));
      };

      try {
        await runLifeOSChat({
          userId: user.id,
          timeZone: user.profile?.timezone ?? "UTC",
          conversationId: body.conversationId,
          message: body.message ?? "",
          signal: request.signal,
          onEvent: send,
        });
      } catch (error) {
        const aiError = AIError.fromUnknown(error);
        aiLog.warn("request_failed", {
          user: publicUserRef(user.id),
          code: aiError.code,
        });
        send({ type: "error", error: userFacingAIError(aiError), code: aiError.code });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
