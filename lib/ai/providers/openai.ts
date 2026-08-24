import { AIError } from "@/lib/ai/errors";
import type {
  AIChatMessage,
  AIChatRequest,
  AIChatResponse,
  AIProvider,
  AIToolCall,
  AIToolDefinition,
} from "@/lib/ai/provider";

type OpenAICompatOptions = {
  id: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

type OpenAIToolCallDelta = {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};

function toOpenAIMessages(messages: AIChatMessage[]) {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool" as const,
        tool_call_id: message.toolCallId,
        content: message.content,
      };
    }
    if (message.role === "assistant" && message.toolCalls?.length) {
      return {
        role: "assistant" as const,
        content: message.content || null,
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }
    return {
      role: message.role,
      content: message.content,
    };
  });
}

function toOpenAITools(tools: AIToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function parseToolCalls(
  raw: Array<{ id?: string; function?: { name?: string; arguments?: string } }> | undefined
): AIToolCall[] | undefined {
  if (!raw?.length) return undefined;
  return raw
    .filter((call) => call.id && call.function?.name)
    .map((call) => ({
      id: call.id as string,
      name: call.function!.name as string,
      arguments: call.function?.arguments || "{}",
    }));
}

function mapFinish(reason: string | null | undefined): AIChatResponse["finishReason"] {
  if (reason === "tool_calls") return "tool_calls";
  if (reason === "length") return "length";
  return "stop";
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 401 || response.status === 403) {
    throw new AIError("provider", "The AI provider rejected the request.");
  }
  if (response.status === 429) {
    throw new AIError("rate_limit", "The AI provider is rate limiting requests.");
  }
  if (response.status === 408 || response.status === 504) {
    throw new AIError("timeout");
  }
  throw new AIError("provider");
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: OpenAICompatOptions) {
    this.id = options.id;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.model = options.model;
  }

  private body(request: AIChatRequest, stream: boolean) {
    return {
      model: request.model ?? this.model,
      messages: toOpenAIMessages(request.messages),
      temperature: 0.3,
      stream,
      ...(request.tools?.length ? { tools: toOpenAITools(request.tools), tool_choice: "auto" } : {}),
    };
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(request, false)),
      signal: request.signal,
    });

    if (!response.ok) await parseError(response);

    let json: {
      model?: string;
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: string | null;
          tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
        };
      }>;
    };

    try {
      json = await response.json();
    } catch (error) {
      throw new AIError("malformed", undefined, { cause: error });
    }

    const choice = json.choices?.[0];
    if (!choice) throw new AIError("malformed");

    return {
      content: choice.message?.content ?? "",
      model: json.model ?? this.model,
      toolCalls: parseToolCalls(choice.message?.tool_calls),
      finishReason: mapFinish(choice.finish_reason),
    };
  }

  async stream(
    request: AIChatRequest,
    onDelta: (text: string) => void
  ): Promise<AIChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.body(request, true)),
      signal: request.signal,
    });

    if (!response.ok) await parseError(response);
    if (!response.body) return this.chat({ ...request, signal: request.signal });

    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let model = this.model;
    let finish: AIChatResponse["finishReason"] = "stop";
    const toolAcc = new Map<number, { id: string; name: string; arguments: string }>();

    const applyDelta = (payload: {
      model?: string;
      choices?: Array<{
        finish_reason?: string | null;
        delta?: {
          content?: string | null;
          tool_calls?: OpenAIToolCallDelta[];
        };
      }>;
    }) => {
      if (payload.model) model = payload.model;
      const choice = payload.choices?.[0];
      if (!choice) return;
      if (choice.finish_reason) finish = mapFinish(choice.finish_reason);
      const delta = choice.delta?.content;
      if (delta) {
        content += delta;
        onDelta(delta);
      }
      for (const call of choice.delta?.tool_calls ?? []) {
        const index = call.index ?? 0;
        const current = toolAcc.get(index) ?? { id: "", name: "", arguments: "" };
        if (call.id) current.id = call.id;
        if (call.function?.name) current.name += call.function.name;
        if (call.function?.arguments) current.arguments += call.function.arguments;
        toolAcc.set(index, current);
      }
    };

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          applyDelta(JSON.parse(data));
        } catch {
          throw new AIError("malformed");
        }
      }
    }

    const toolCalls = [...toolAcc.values()]
      .filter((call) => call.id && call.name)
      .map((call) => ({ id: call.id, name: call.name, arguments: call.arguments || "{}" }));

    return {
      content,
      model,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: toolCalls.length ? "tool_calls" : finish,
    };
  }
}
