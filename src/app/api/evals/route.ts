import { runRetrievalEvals } from "@/lib/evals";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { k = 3 } = (await req.json().catch(() => ({}))) as { k?: number };
  return Response.json(await runRetrievalEvals(Math.min(Math.max(Number(k) || 3, 1), 10)));
}
