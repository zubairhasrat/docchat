<img width="1447" height="783" alt="Screenshot 2026-09-28 at 11 10 42 PM" src="https://github.com/user-attachments/assets/146aecf6-0abf-481c-90fe-32c3749d8a2f" />
# DocChat: RAG chatbot over your documents

Upload PDFs, Markdown or web pages and ask questions. Answers stream in with numbered source citations, and the bot says so when the answer isn't in your documents instead of guessing.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS and the Vercel AI SDK. Works with **OpenAI or Anthropic Claude** (switchable in the header when both keys are set).

<!-- Add a screenshot after running with your API key: docs/screenshot-chat.png -->

## Features

- **Ingestion:** drag-and-drop PDF, Markdown, TXT, HTML, or import a public URL (with SSRF protection: private/internal addresses and redirects are blocked).
- **Chunking:** paragraph- and sentence-aware chunks with overlap; each chunk is prefixed with its document title for better retrieval.
- **Hybrid retrieval:** BM25 keyword search fused with OpenAI embeddings using reciprocal rank fusion. With only an Anthropic key, it falls back to BM25.
- **Grounded answers:** strict system prompt, sources streamed to the UI before the answer, clickable `[n]` citations that open the exact passage.
- **Model-agnostic:** OpenAI (`gpt-5-mini` by default) or Claude (`claude-sonnet-4-5` by default), configurable via env vars.
- **Evals:** `/evals` runs a retrieval test set (hit rate@K, top-1 accuracy, MRR) so you can measure changes to chunking or ranking.
- **Tests:** unit tests for chunking/ranking/metrics, a retrieval regression test, and a streaming test of the chat route using a mock model.

## Quick start

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY and/or ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

The app starts with a sample help center for **Brightdesk**, a fictional support SaaS, so you can try it immediately. Use "Reset to sample knowledge base" to restore it (this also re-embeds the samples once you add an OpenAI key).

```bash
npm test          # vitest
npm run typecheck
npm run build
```

## How it works

```
Upload / URL ──> extract text ──> chunk ──> embed (OpenAI, optional) ──> store
Question ──> BM25 + vector search ──> RRF fusion ──> top 5 passages
          ──> stream sources to UI ──> LLM answers only from passages, citing [n]
```

| Path | What it does |
| --- | --- |
| `src/lib/store.ts` | Document store, ingestion, hybrid search |
| `src/lib/bm25.ts` | BM25 scoring and reciprocal rank fusion |
| `src/lib/text.ts` | Tokenizer, chunker, HTML to text |
| `src/lib/fetch-url.ts` | Safe URL fetching |
| `src/app/api/chat/route.ts` | Retrieval + streaming answer with sources |
| `src/app/api/documents/route.ts` | Upload, URL import, list, delete |
| `src/lib/evals.ts`, `src/app/evals` | Retrieval evaluation |

## Deploying

Deploys to Vercel as-is. The demo store is an in-memory index persisted to `.data/store.json` in development; on serverless hosts it lives in memory per instance. For production, swap `src/lib/store.ts` for Postgres + pgvector (e.g. Supabase) or another vector database; the rest of the app doesn't change.

## License

MIT
