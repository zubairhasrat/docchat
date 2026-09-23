import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { chatModel, modelLabel, resolveProvider } from "@/lib/config";
import { search } from "@/lib/store";
import type { Citation, DocChatMessage } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM = `You are a support assistant that answers ONLY from the numbered context passages provided.
Rules:
- Cite every factual statement with the passage number in square brackets, e.g. [1] or [2][3].
- If the passages do not contain the answer, say you couldn't find it in the knowledge base and suggest contacting support. Never guess or use outside knowledge.
- Be concise and friendly. Use short paragraphs or bullet points.
- Quote exact numbers, prices and settings paths from the passages.`;

function lastUserText(messages: DocChatMessage[]) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return (
    last?.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? ""
  );
}

export async function POST(req: Request) {
  const { messages, provider: requested }: { messages: DocChatMessage[]; provider?: string } =
    await req.json();

  const provider = resolveProvider(requested);
  if (!provider) {
    return Response.json(
      { error: "No AI provider configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env.local." },
      { status: 400 },
    );
  }

  const question = lastUserText(messages).slice(0, 2000);
  // Use the last few turns for retrieval so follow-ups ("what about SSO?") keep context.
  const history = messages
    .slice(-5, -1)
    .map((m) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" "))
    .join(" ")
    .slice(-600);
  const hits = await search(`${question} ${history}`.trim(), 5);

  const citations: Citation[] = hits.map((h, i) => ({
    n: i + 1,
    docId: h.doc.id,
    title: h.doc.title,
    source: h.doc.source,
    snippet: h.chunk.text,
  }));

  const context = citations.length
    ? citations.map((c) => `[${c.n}] (${c.title})\n${c.snippet}`).join("\n\n---\n\n")
    : "(no passages found)";

  const stream = createUIMessageStream<DocChatMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageMetadata: { provider, model: modelLabel(provider) } });
      writer.write({ type: "data-sources", data: { citations } });

      const result = streamText({
        model: chatModel(provider),
        system: `${SYSTEM}\n\nContext passages:\n\n${context}`,
        messages: await convertToModelMessages(messages.slice(-10)),
        temperature: provider === "anthropic" ? 0.2 : undefined,
      });

      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onError: (error) =>
      error instanceof Error ? error.message : "Something went wrong while generating the answer.",
  });

  return createUIMessageStreamResponse({ stream });
}
