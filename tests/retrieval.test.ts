import { describe, expect, it, beforeAll } from "vitest";
import { chunkText, tokenize, htmlToText } from "../src/lib/text";
import { bm25Scores, rankByScore, reciprocalRankFusion } from "../src/lib/bm25";
import { summarize } from "../src/lib/evals";

describe("text utils", () => {
  it("tokenizes and drops stopwords", () => {
    expect(tokenize("How do I set up the SSO?")).toEqual(["set", "sso"]);
  });
  it("chunks long text with overlap and keeps short text whole", () => {
    expect(chunkText("Short paragraph.")).toEqual(["Short paragraph."]);
    const para = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} explains a detail.`).join(" ");
    const chunks = chunkText(`${para}\n\n${para}`, { maxChars: 400, overlap: 80 });
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.length <= 400)).toBe(true);
  });
  it("strips html", () => {
    const { title, text } = htmlToText("<html><title>Hi</title><script>x()</script><p>Hello <b>world</b></p></html>");
    expect(title).toBe("Hi");
    expect(text).toContain("Hello world");
    expect(text).not.toContain("x()");
  });
});

describe("ranking", () => {
  const docs = [
    { id: "a", tokens: tokenize("billing plans price per agent annual discount") },
    { id: "b", tokens: tokenize("single sign-on okta saml setup") },
    { id: "c", tokens: tokenize("data region encryption soc") },
  ];
  it("bm25 ranks the matching doc first", () => {
    expect(rankByScore(bm25Scores("okta sso setup", docs))[0]).toBe("b");
    expect(rankByScore(bm25Scores("annual discount", docs))[0]).toBe("a");
  });
  it("rrf rewards items ranked high in several lists", () => {
    const fused = rankByScore(reciprocalRankFusion([["a", "b", "c"], ["b", "a", "c"], ["b", "c", "a"]]));
    expect(fused[0]).toBe("b");
  });
  it("summarizes eval metrics", () => {
    const s = summarize(
      [
        { question: "q1", expectedSource: "x", retrieved: [], rank: 1 },
        { question: "q2", expectedSource: "x", retrieved: [], rank: 2 },
        { question: "q3", expectedSource: "x", retrieved: [], rank: null },
      ],
      3,
    );
    expect(s.hitRateAtK).toBeCloseTo(2 / 3);
    expect(s.top1Accuracy).toBeCloseTo(1 / 3);
    expect(s.mrr).toBeCloseTo(0.5);
  });
});

describe("sample knowledge base (keyword retrieval)", () => {
  beforeAll(() => {
    process.env.PERSIST_STORE = "0";
    delete process.env.OPENAI_API_KEY;
  });
  it("retrieves the right document for every eval question", async () => {
    const { runRetrievalEvals } = await import("../src/lib/evals");
    const { summary, results } = await runRetrievalEvals(3);
    const misses = results.filter((r) => !r.rank).map((r) => r.question);
    expect(misses).toEqual([]);
    expect(summary.hitRateAtK).toBe(1);
  });
});
