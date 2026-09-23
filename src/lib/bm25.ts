import { tokenize } from "./text";

export interface Bm25Doc {
  id: string;
  tokens: string[];
}

/** Minimal Okapi BM25 over pre-tokenized chunks. */
export function bm25Scores(
  query: string,
  docs: Bm25Doc[],
  { k1 = 1.2, b = 0.75 }: { k1?: number; b?: number } = {},
): Map<string, number> {
  const scores = new Map<string, number>();
  const qTerms = [...new Set(tokenize(query))];
  if (!qTerms.length || !docs.length) return scores;

  const avgLen = docs.reduce((s, d) => s + d.tokens.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const N = docs.length;

  for (const d of docs) {
    const tf = new Map<string, number>();
    for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const q of qTerms) {
      const f = tf.get(q);
      if (!f) continue;
      const n = df.get(q) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.tokens.length) / avgLen)));
    }
    if (score > 0) scores.set(d.id, score);
  }
  return scores;
}

/** Reciprocal rank fusion of several ranked id lists. */
export function reciprocalRankFusion(rankings: string[][], k = 60): Map<string, number> {
  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, i) => fused.set(id, (fused.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return fused;
}

export function rankByScore(scores: Map<string, number>): string[] {
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
