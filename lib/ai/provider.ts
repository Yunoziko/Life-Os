export type AIChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AIChatRequest = {
  messages: AIChatMessage[];
  model?: string;
};

export type AIChatResponse = {
  content: string;
  model: string;
};

export interface AIProvider {
  id: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
}

export class UnconfiguredAIProvider implements AIProvider {
  id = "unconfigured";

  async chat(): Promise<AIChatResponse> {
    throw new Error("An AI provider has not been configured yet.");
  }
}
