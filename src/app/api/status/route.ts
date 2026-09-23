import { availableProviders, embeddingsEnabled, modelLabel } from "@/lib/config";
import { storeStats } from "@/lib/store";

export async function GET(request: Request) {
  void request;
  const providers = availableProviders();
  return Response.json({
    providers: providers.map((p) => ({ id: p, model: modelLabel(p) })),
    retrieval: embeddingsEnabled() ? "hybrid (BM25 + embeddings)" : "keyword (BM25)",
    stats: await storeStats(),
  });
}
