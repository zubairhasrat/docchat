import { cosineSimilarity, embedMany, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { bm25Scores, rankByScore, reciprocalRankFusion } from "./bm25";
import { chunkText, tokenize } from "./text";
import { SEED_DOCS } from "./seed";
import { embeddingsEnabled, OPENAI_EMBEDDING_MODEL } from "./config";

export interface DocumentMeta {
  id: string;
  title: string;
  source: string;
  kind: "sample" | "upload" | "url" | "text";
  chunkCount: number;
  createdAt: string;
}

export interface Chunk {
  id: string;
  docId: string;
  index: number;
  text: string;
  tokens: string[];
  embedding?: number[];
}

export interface SearchHit {
  chunk: Chunk;
  doc: DocumentMeta;
  score: number;
}

interface StoreState {
  documents: DocumentMeta[];
  chunks: Chunk[];
}

const DATA_FILE = path.join(process.cwd(), ".data", "store.json");
const persist = process.env.PERSIST_STORE !== "0";

// Survive Next.js hot reloads in dev.
const g = globalThis as unknown as { __docchatStore?: Promise<StoreState> };

async function load(): Promise<StoreState> {
  if (persist) {
    try {
      return JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as StoreState;
    } catch {
      /* first run */
    }
  }
  const state: StoreState = { documents: [], chunks: [] };
  for (const d of SEED_DOCS) await addToState(state, d.title, d.source, d.text, "sample");
  await save(state);
  return state;
}

async function save(state: StoreState) {
  if (!persist) return;
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(state));
  } catch {
    // Read-only filesystems (e.g. serverless) keep the store in memory only.
  }
}

function getState() {
  g.__docchatStore ??= load();
  return g.__docchatStore;
}

async function embedTexts(values: string[]): Promise<number[][] | undefined> {
  if (!embeddingsEnabled() || values.length === 0) return undefined;
  const { embeddings } = await embedMany({
    model: openai.embeddingModel(OPENAI_EMBEDDING_MODEL),
    values,
    maxParallelCalls: 2,
  });
  return embeddings;
}

async function addToState(
  state: StoreState,
  title: string,
  source: string,
  text: string,
  kind: DocumentMeta["kind"],
): Promise<DocumentMeta> {
  const pieces = chunkText(text);
  if (!pieces.length) throw new Error("No readable text found in this document.");
  const docId = randomUUID();
  // Prefix the title so chunks keep their context when retrieved alone.
  const embeddings = await embedTexts(pieces.map((p) => `${title}\n\n${p}`));
  const chunks: Chunk[] = pieces.map((p, i) => ({
    id: `${docId}:${i}`,
    docId,
    index: i,
    text: p,
    tokens: tokenize(`${title} ${p}`),
    embedding: embeddings?.[i],
  }));
  const doc: DocumentMeta = {
    id: docId,
    title,
    source,
    kind,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  };
  state.documents.push(doc);
  state.chunks.push(...chunks);
  return doc;
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  return [...(await getState()).documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addDocument(
  title: string,
  source: string,
  text: string,
  kind: DocumentMeta["kind"],
) {
  const state = await getState();
  const doc = await addToState(state, title, source, text, kind);
  await save(state);
  return doc;
}

export async function removeDocument(id: string) {
  const state = await getState();
  state.documents = state.documents.filter((d) => d.id !== id);
  state.chunks = state.chunks.filter((c) => c.docId !== id);
  await save(state);
}

export async function resetStore() {
  g.__docchatStore = undefined;
  if (persist) await fs.rm(DATA_FILE, { force: true });
  await getState();
}

/**
 * Hybrid retrieval: BM25 keyword ranking fused with dense vector ranking
 * (when embeddings are enabled) using reciprocal rank fusion.
 */
export async function search(query: string, k = 5): Promise<SearchHit[]> {
  const state = await getState();
  if (!state.chunks.length) return [];

  const keywordRanking = rankByScore(bm25Scores(query, state.chunks)).slice(0, 25);
  const rankings = [keywordRanking];

  const withVectors = state.chunks.filter((c) => c.embedding);
  if (embeddingsEnabled() && withVectors.length) {
    const { embedding } = await embed({
      model: openai.embeddingModel(OPENAI_EMBEDDING_MODEL),
      value: query,
    });
    const vectorScores = new Map(
      withVectors.map((c) => [c.id, cosineSimilarity(embedding, c.embedding!)] as const),
    );
    rankings.push(rankByScore(vectorScores).slice(0, 25));
  }

  const fused = rankings.length > 1 ? reciprocalRankFusion(rankings) : null;
  const ids = fused ? rankByScore(fused) : keywordRanking;
  const byId = new Map(state.chunks.map((c) => [c.id, c]));
  const docs = new Map(state.documents.map((d) => [d.id, d]));

  return ids.slice(0, k).flatMap((id) => {
    const chunk = byId.get(id);
    const doc = chunk && docs.get(chunk.docId);
    if (!chunk || !doc) return [];
    return [{ chunk, doc, score: fused ? fused.get(id)! : 0 }];
  });
}

export async function storeStats() {
  const state = await getState();
  return {
    documents: state.documents.length,
    chunks: state.chunks.length,
    embedded: state.chunks.filter((c) => c.embedding).length,
  };
}
