import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { runLifeOSChat, type ChatStreamEvent } from "@/lib/ai/chat";
import { AIError, userFacingAIError } from "@/lib/ai/errors";
import { aiLog, publicUserRef } from "@/lib/ai/logger";
import { assertTrustedOrigin, createRequestId } from "@/lib/security/http";
import { userFacingFailure } from "@/lib/observability/log";

export const runtime = "nodejs";

function encode(event: ChatStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || createRequestId();
  try {
    assertTrustedOrigin(request);
  } catch {
    return new Response(encode({ type: "error", error: "That request isn’t allowed.", code: "unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId },
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new Response(encode({ type: "error", error: "Please sign in to use AZIO AI.", code: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId },
    });
  }

  let body: { conversationId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(encode({ type: "error", error: "That request couldn’t be read.", code: "malformed" }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId },
    });
  }

  if (body.conversationId && !/^[0-9a-f-]{36}$/i.test(body.conversationId)) {
    return new Response(encode({ type: "error", error: "That conversation isn’t available.", code: "invalid_args" }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user) {
    return new Response(encode({ type: "error", error: "Please sign in to use AZIO AI.", code: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "x-request-id": requestId },
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
          requestId,
        });
        send({
          type: "error",
          error: aiError.code === "provider" ? userFacingFailure(requestId) : userFacingAIError(aiError),
          code: aiError.code,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "x-request-id": requestId,
    },
  });
}
