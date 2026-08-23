import { UnconfiguredAIProvider, type AIProvider } from "@/lib/ai/provider";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  // Swap this factory when a provider is wired. Keep the rest of the app
  // talking to this interface so the assistant can land without rewrites.
  cached = new UnconfiguredAIProvider();
  return cached;
}
