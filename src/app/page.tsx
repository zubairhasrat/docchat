"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RichText } from "@/components/rich-text";
import { Sidebar, type DocItem } from "@/components/sidebar";
import type { Citation, DocChatMessage } from "@/lib/types";

interface Status {
  providers: { id: string; model: string }[];
  retrieval: string;
}

const SUGGESTIONS = [
  "How much is the Team plan, and is there an annual discount?",
  "How do I set up SSO with Okta?",
  "Can I get a refund if I cancel an annual plan?",
  "Where is my data stored?",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [active, setActive] = useState<{ msg: string; n: number } | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport<DocChatMessage>({ api: "/api/chat" }), []);
  const { messages, sendMessage, status: chatStatus, error, stop, setMessages } = useChat<DocChatMessage>({ transport });

  const refreshDocs = useCallback(() => {
    return Promise.all([fetch("/api/documents").then((r) => r.json()), fetch("/api/status").then((r) => r.json())]).then(
      ([d, s]: [{ documents: DocItem[] }, Status]) => {
        setDocuments(d.documents);
        setStatus(s);
        setProvider((p) => p || s.providers[0]?.id || "");
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/api/documents").then((r) => r.json()), fetch("/api/status").then((r) => r.json())]).then(
      ([d, s]: [{ documents: DocItem[] }, Status]) => {
        if (cancelled) return;
        setDocuments(d.documents);
        setStatus(s);
        setProvider((p) => p || s.providers[0]?.id || "");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const busy = chatStatus === "submitted" || chatStatus === "streaming";
  const noProvider = status && status.providers.length === 0;

  function ask(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() }, { body: { provider } });
    setInput("");
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm md:hidden dark:border-zinc-700"
            onClick={() => setShowDocs((v) => !v)}
          >
            Docs
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">D</div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">DocChat</h1>
            <p className="text-xs text-zinc-500">Answers from your documents, with sources</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {status && status.providers.length > 0 && (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
              aria-label="AI model"
            >
              {status.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === "openai" ? "OpenAI" : "Claude"} · {p.model}
                </option>
              ))}
            </select>
          )}
          <Link href="/evals" className="rounded-lg px-2 py-1 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
            Evals
          </Link>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="rounded-lg px-2 py-1 text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
              New chat
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className={`${showDocs ? "block" : "hidden"} absolute inset-y-14 left-0 z-10 w-80 md:static md:block md:w-80`}>
          <Sidebar documents={documents} onChange={refreshDocs} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
              {noProvider && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  Add <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code> to <code>.env.local</code> and restart to start chatting.
                </div>
              )}

              {messages.length === 0 && (
                <div className="pt-10 text-center">
                  <h2 className="text-2xl font-semibold tracking-tight">Ask anything about your docs</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    Loaded with a sample help center for &ldquo;Brightdesk&rdquo;, a fictional support tool. Upload your own PDFs or URLs on the left.
                  </p>
                  <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        disabled={!!noProvider}
                        className="rounded-xl border border-zinc-200 p-3 text-left text-sm hover:border-teal-400 hover:bg-teal-50/50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-teal-950/20"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {status && <p className="mt-6 text-xs text-zinc-400">Retrieval: {status.retrieval}</p>}
                </div>
              )}

              {messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const citations =
                  m.parts.find((p): p is { type: "data-sources"; data: { citations: Citation[] } } => p.type === "data-sources")
                    ?.data.citations ?? [];
                const used = new Set([...text.matchAll(/\[(\d+)\]/g)].map((x) => Number(x[1])));
                const shown = citations.filter((c) => used.has(c.n));
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-zinc-900 px-4 py-2.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                        {text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="space-y-3">
                    <div className="text-[15px]">
                      {text ? (
                        <RichText text={text} onCite={(n) => setActive({ msg: m.id, n })} />
                      ) : (
                        <span className="inline-flex gap-1 text-zinc-400">
                          <span className="animate-pulse">Searching the knowledge base…</span>
                        </span>
                      )}
                    </div>
                    {shown.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {shown.map((c) => {
                          const open = active?.msg === m.id && active.n === c.n;
                          return (
                            <button
                              key={c.n}
                              onClick={() => setActive(open ? null : { msg: m.id, n: c.n })}
                              className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                                open ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30" : "border-zinc-200 hover:border-teal-400 dark:border-zinc-800"
                              }`}
                            >
                              <span className="font-semibold text-teal-700 dark:text-teal-300">[{c.n}]</span> {c.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {active?.msg === m.id &&
                      citations
                        .filter((c) => c.n === active.n)
                        .map((c) => (
                          <blockquote key={c.n} className="rounded-xl border-l-4 border-teal-500 bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            <p className="mb-1 text-xs font-semibold text-zinc-500">
                              [{c.n}] {c.title} · {c.source}
                            </p>
                            <p className="whitespace-pre-wrap">{c.snippet}</p>
                          </blockquote>
                        ))}
                    {m.metadata?.model && <p className="text-[11px] text-zinc-400">Answered by {m.metadata.model}</p>}
                  </div>
                );
              })}

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error.message || "Something went wrong."}
                </div>
              )}
              <div ref={bottom} />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="border-t border-black/10 p-4 dark:border-white/10"
          >
            <div className="mx-auto flex max-w-3xl gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your documents…"
                disabled={!!noProvider}
                className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
              />
              {busy ? (
                <button type="button" onClick={stop} className="rounded-xl border border-zinc-300 px-4 text-sm dark:border-zinc-700">
                  Stop
                </button>
              ) : (
                <button disabled={!input.trim() || !!noProvider} className="rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40">
                  Ask
                </button>
              )}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
