export type AIChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: AIToolCall[];
};

export type AIToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type AIToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AIChatRequest = {
  messages: AIChatMessage[];
  tools?: AIToolDefinition[];
  model?: string;
  signal?: AbortSignal;
};

export type AIChatResponse = {
  content: string;
  model: string;
  toolCalls?: AIToolCall[];
  finishReason: "stop" | "tool_calls" | "length";
};

export interface AIProvider {
  id: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  stream?(
    request: AIChatRequest,
    onDelta: (text: string) => void
  ): Promise<AIChatResponse>;
}

export class UnconfiguredAIProvider implements AIProvider {
  id = "unconfigured";

  async chat(): Promise<AIChatResponse> {
    const { AIError } = await import("@/lib/ai/errors");
    throw new AIError("missing_key");
  }
}
