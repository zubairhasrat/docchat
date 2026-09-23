import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

export type Provider = "openai" | "anthropic";

export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini";
export const ANTHROPIC_CHAT_MODEL =
  process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-5";
export const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export function availableProviders(): Provider[] {
  const list: Provider[] = [];
  if (process.env.OPENAI_API_KEY) list.push("openai");
  if (process.env.ANTHROPIC_API_KEY) list.push("anthropic");
  return list;
}

/** Picks the requested provider if configured, else the first configured one. */
export function resolveProvider(requested?: string): Provider | null {
  const available = availableProviders();
  if (requested && available.includes(requested as Provider)) {
    return requested as Provider;
  }
  const preferred = process.env.DEFAULT_PROVIDER as Provider | undefined;
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? null;
}

export function chatModel(provider: Provider) {
  return provider === "openai"
    ? openai(OPENAI_CHAT_MODEL)
    : anthropic(ANTHROPIC_CHAT_MODEL);
}

export function modelLabel(provider: Provider) {
  return provider === "openai" ? OPENAI_CHAT_MODEL : ANTHROPIC_CHAT_MODEL;
}

/** Dense embeddings need OpenAI; without it retrieval falls back to BM25 only. */
export function embeddingsEnabled() {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.DISABLE_EMBEDDINGS !== "1";
}
