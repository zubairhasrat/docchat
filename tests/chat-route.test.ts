import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";

process.env.PERSIST_STORE = "0";
let capturedSystem = "";

vi.mock("@/lib/config", async (orig) => {
  const actual = await orig<typeof import("@/lib/config")>();
  return {
    ...actual,
    resolveProvider: () => "openai",
    embeddingsEnabled: () => false,
    chatModel: () =>
      new MockLanguageModelV4({
        doStream: async ({ prompt }) => {
          capturedSystem = JSON.stringify(prompt);
          return {
            stream: simulateReadableStream({
              chunks: [
                { type: "text-start", id: "t" },
                { type: "text-delta", id: "t", delta: "The Team plan costs $49 per agent per month [1]." },
                { type: "text-end", id: "t" },
                {
                  type: "finish",
                  finishReason: { unified: "stop", raw: undefined },
                  logprobs: undefined,
                  usage: {
                    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
                    outputTokens: { total: 1, text: 1, reasoning: undefined },
                  },
                },
              ],
            }),
          };
        },
      }),
  };
});

describe("POST /api/chat", () => {
  it("streams sources first, then the grounded answer", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "How much is the Team plan?" }] }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    const sourcesAt = body.indexOf('"type":"data-sources"');
    const textAt = body.indexOf("$49 per agent");
    expect(sourcesAt).toBeGreaterThan(-1);
    expect(textAt).toBeGreaterThan(sourcesAt);
    expect(body).toContain("Plans and billing");
    expect(capturedSystem).toMatch(/\[\d\] \(Plans and billing\)/);
  });
});
