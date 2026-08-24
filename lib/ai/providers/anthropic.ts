import { AIError } from "@/lib/ai/errors";
import type {
  AIChatMessage,
  AIChatRequest,
  AIChatResponse,
  AIProvider,
  AIToolCall,
} from "@/lib/ai/provider";

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

function splitSystem(messages: AIChatMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const rest = messages.filter((message) => message.role !== "system");
  return { system, rest };
}

function toAnthropicMessages(messages: AIChatMessage[]) {
  const mapped: Array<{ role: "user" | "assistant"; content: AnthropicContent[] }> = [];

  for (const message of messages) {
    if (message.role === "tool") {
      const last = mapped[mapped.length - 1];
      const block: AnthropicContent = {
        type: "tool_result",
        tool_use_id: message.toolCallId ?? "",
        content: message.content,
      };
      if (last?.role === "user") {
        last.content.push(block);
      } else {
        mapped.push({ role: "user", content: [block] });
      }
      continue;
    }

    if (message.role === "assistant") {
      const content: AnthropicContent[] = [];
      if (message.content) content.push({ type: "text", text: message.content });
      for (const call of message.toolCalls ?? []) {
        let input: unknown = {};
        try {
          input = JSON.parse(call.arguments || "{}");
        } catch {
          input = {};
        }
        content.push({ type: "tool_use", id: call.id, name: call.name, input });
      }
      mapped.push({ role: "assistant", content: content.length ? content : [{ type: "text", text: "" }] });
      continue;
    }

    if (message.role === "user") {
      mapped.push({ role: "user", content: [{ type: "text", text: message.content }] });
    }
  }

  return mapped;
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 401 || response.status === 403) {
    throw new AIError("provider", "The AI provider rejected the request.");
  }
  if (response.status === 429) {
    throw new AIError("rate_limit", "The AI provider is rate limiting requests.");
  }
  throw new AIError("provider");
}

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  private payload(request: AIChatRequest, stream: boolean) {
    const { system, rest } = splitSystem(request.messages);
    return {
      model: request.model ?? this.model,
      max_tokens: 2048,
      temperature: 0.3,
      system: system || undefined,
      messages: toAnthropicMessages(rest),
      stream,
      ...(request.tools?.length
        ? {
            tools: request.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.parameters,
            })),
          }
        : {}),
    };
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(this.payload(request, false)),
      signal: request.signal,
    });

    if (!response.ok) await parseError(response);

    let json: {
      model?: string;
      stop_reason?: string;
      content?: AnthropicContent[];
    };

    try {
      json = await response.json();
    } catch (error) {
      throw new AIError("malformed", undefined, { cause: error });
    }

    const text = (json.content ?? [])
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    const toolCalls: AIToolCall[] = (json.content ?? [])
      .filter((block): block is { type: "tool_use"; id: string; name: string; input: unknown } => block.type === "tool_use")
      .map((block) => ({
        id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input ?? {}),
      }));

    return {
      content: text,
      model: json.model ?? this.model,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: toolCalls.length ? "tool_calls" : json.stop_reason === "max_tokens" ? "length" : "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onDelta: (text: string) => void
  ): Promise<AIChatResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(this.payload(request, true)),
      signal: request.signal,
    });

    if (!response.ok) await parseError(response);
    if (!response.body) return this.chat({ ...request, signal: request.signal });

    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    const toolCalls: AIToolCall[] = [];
    let model = this.model;
    let finish: AIChatResponse["finishReason"] = "stop";

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const data = JSON.parse(dataLine.slice(5).trim()) as {
            type?: string;
            delta?: { type?: string; text?: string };
            content_block?: { type?: string; id?: string; name?: string; input?: unknown };
            message?: { model?: string };
            index?: number;
          };
          if (data.message?.model) model = data.message.model;
          if (data.type === "content_block_delta" && data.delta?.text) {
            content += data.delta.text;
            onDelta(data.delta.text);
          }
          if (data.type === "content_block_start" && data.content_block?.type === "tool_use") {
            toolCalls.push({
              id: data.content_block.id ?? crypto.randomUUID(),
              name: data.content_block.name ?? "",
              arguments: JSON.stringify(data.content_block.input ?? {}),
            });
          }
          if (data.type === "message_delta" && data.delta) {
            const stop = (data as { delta?: { stop_reason?: string } }).delta?.stop_reason;
            if (stop === "tool_use") finish = "tool_calls";
            if (stop === "max_tokens") finish = "length";
          }
        } catch {
          throw new AIError("malformed");
        }
      }
    }

    return {
      content,
      model,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: toolCalls.length ? "tool_calls" : finish,
    };
  }
}
