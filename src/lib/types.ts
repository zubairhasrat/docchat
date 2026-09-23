import type { UIMessage } from "ai";

export interface Citation {
  n: number;
  docId: string;
  title: string;
  source: string;
  snippet: string;
}

export type DocChatMessage = UIMessage<
  { provider?: string; model?: string },
  { sources: { citations: Citation[] } }
>;
