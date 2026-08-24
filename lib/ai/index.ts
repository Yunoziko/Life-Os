import { UnconfiguredAIProvider, type AIProvider } from "@/lib/ai/provider";
import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  google: "gemini-2.0-flash",
};

function providerName() {
  return (process.env.AI_PROVIDER ?? "openai").trim().toLowerCase();
}

function resolveApiKey(name: string) {
  if (process.env.AI_API_KEY?.trim()) return process.env.AI_API_KEY.trim();
  if (name === "anthropic") return process.env.ANTHROPIC_API_KEY?.trim() || "";
  if (name === "google") return process.env.GOOGLE_API_KEY?.trim() || "";
  return process.env.OPENAI_API_KEY?.trim() || "";
}

export function isAIConfigured() {
  return Boolean(resolveApiKey(providerName()));
}

function createProvider(): AIProvider {
  const name = providerName();
  const apiKey = resolveApiKey(name);
  if (!apiKey) return new UnconfiguredAIProvider();

  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODELS[name] || DEFAULT_MODELS.openai;

  if (name === "anthropic") {
    return new AnthropicProvider(apiKey, model);
  }

  if (name === "google") {
    return new OpenAICompatibleProvider({
      id: "google",
      apiKey,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model,
    });
  }

  return new OpenAICompatibleProvider({
    id: "openai",
    apiKey,
    baseUrl: process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1",
    model,
  });
}

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (process.env.NODE_ENV !== "production") {
    return createProvider();
  }
  if (cached) return cached;
  cached = createProvider();
  return cached;
}
