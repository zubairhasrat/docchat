"use client";

import Link from "next/link";
import { useState } from "react";

interface EvalResponse {
  k: number;
  summary: { cases: number; hitRateAtK: number; top1Accuracy: number; mrr: number };
  results: { question: string; expectedSource: string; retrieved: string[]; rank: number | null }[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function EvalsPage() {
  const [k, setK] = useState(3);
  const [data, setData] = useState<EvalResponse | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/evals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ k }),
      });
      setData(await res.json());
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-teal-700 hover:underline dark:text-teal-300">
        ← Back to chat
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Retrieval evals</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        A fixed test set of questions against the sample knowledge base. For each question we check whether the document
        that holds the answer is retrieved in the top K results. Run it after changing chunking, embeddings or ranking to
        catch regressions before users do.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm">
          Top K{" "}
          <select value={k} onChange={(e) => setK(Number(e.target.value))} className="ml-1 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700">
            {[1, 3, 5].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button onClick={run} disabled={running} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {running ? "Running…" : "Run evals"}
        </button>
      </div>

      {data && (
        <>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              [`Hit rate @${data.k}`, pct(data.summary.hitRateAtK)],
              ["Top-1 accuracy", pct(data.summary.top1Accuracy)],
              ["MRR", data.summary.mrr.toFixed(2)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Expected source</th>
                  <th className="px-3 py-2 font-medium">Rank</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.question} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-3 py-2">{r.question}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{r.expectedSource}</td>
                    <td className="px-3 py-2">
                      {r.rank ? (
                        <span className="rounded-md bg-teal-600/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">#{r.rank}</span>
                      ) : (
                        <span className="rounded-md bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">miss</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
