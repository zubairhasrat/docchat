import { search } from "./store";

/** Retrieval test set for the sample knowledge base. */
export const EVAL_CASES: { question: string; expectedSource: string }[] = [
  { question: "How much does the Team plan cost per agent?", expectedSource: "help/billing.md" },
  { question: "Do you give a discount if I pay yearly?", expectedSource: "help/billing.md" },
  { question: "Can I get my money back on an annual plan?", expectedSource: "help/trial-and-cancellation.md" },
  { question: "Do I need a credit card to start the trial?", expectedSource: "help/trial-and-cancellation.md" },
  { question: "How do I set up Okta login?", expectedSource: "help/sso.md" },
  { question: "Can agents still log in with a password when SSO is enforced?", expectedSource: "help/sso.md" },
  { question: "What is the API rate limit on the Business plan?", expectedSource: "help/integrations.md" },
  { question: "Can agents refund a Shopify order from a ticket?", expectedSource: "help/integrations.md" },
  { question: "Where is my data stored and can I move regions?", expectedSource: "help/security.md" },
  { question: "Are you SOC 2 certified?", expectedSource: "help/security.md" },
  { question: "How many automation rules can I have on Team?", expectedSource: "help/automations.md" },
  { question: "Do SLA timers pause outside business hours?", expectedSource: "help/automations.md" },
];

export interface EvalResult {
  question: string;
  expectedSource: string;
  retrieved: string[];
  rank: number | null;
}

export function summarize(results: EvalResult[], k: number) {
  const n = results.length || 1;
  const hits = results.filter((r) => r.rank !== null && r.rank <= k).length;
  const top1 = results.filter((r) => r.rank === 1).length;
  const mrr = results.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / n;
  return {
    cases: results.length,
    hitRateAtK: hits / n,
    top1Accuracy: top1 / n,
    mrr,
  };
}

export async function runRetrievalEvals(k = 3) {
  const results: EvalResult[] = [];
  for (const c of EVAL_CASES) {
    const hits = await search(c.question, k);
    const retrieved = [...new Set(hits.map((h) => h.doc.source))];
    const idx = retrieved.indexOf(c.expectedSource);
    results.push({ ...c, retrieved, rank: idx >= 0 ? idx + 1 : null });
  }
  return { k, summary: summarize(results, k), results };
}
