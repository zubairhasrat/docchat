"use client";

import { useRef, useState } from "react";

export interface DocItem {
  id: string;
  title: string;
  source: string;
  kind: "sample" | "upload" | "url" | "text";
  chunkCount: number;
}

const KIND_LABEL: Record<DocItem["kind"], string> = {
  sample: "Sample",
  upload: "File",
  url: "Web page",
  text: "Text",
};

export function Sidebar({
  documents,
  onChange,
}: {
  documents: DocItem[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function run(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      onChange();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(null);
    }
  }

  function uploadFiles(files: FileList | File[]) {
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    return run("Indexing files…", () => fetch("/api/documents", { method: "POST", body: form }));
  }

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto border-r border-black/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/60">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Knowledge base</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {documents.length} documents · {documents.reduce((s, d) => s + d.chunkCount, 0)} chunks
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center text-sm transition ${
          dragging
            ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
            : "border-zinc-300 hover:border-teal-400 dark:border-zinc-700"
        }`}
      >
        <p className="font-medium">Drop PDFs or docs here</p>
        <p className="mt-1 text-xs text-zinc-500">PDF, Markdown, TXT, HTML · up to 10 MB</p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt,.csv,.json,.html,.htm"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!url.trim()) return;
          const ok = await run("Fetching page…", () =>
            fetch("/api/documents", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ url: url.trim() }),
            }),
          );
          if (ok) setUrl("");
        }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://help.example.com/page"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button className="rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
          Add
        </button>
      </form>

      {busy && <p className="text-xs text-teal-700 dark:text-teal-300">{busy}</p>}
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <ul className="flex-1 space-y-1">
        {documents.map((d) => (
          <li
            key={d.id}
            className="group flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{d.title}</p>
              <p className="truncate text-xs text-zinc-500">
                {KIND_LABEL[d.kind]} · {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
              </p>
            </div>
            <button
              onClick={() =>
                run("Removing…", () => fetch(`/api/documents?id=${encodeURIComponent(d.id)}`, { method: "DELETE" }))
              }
              className="shrink-0 rounded px-1.5 text-xs text-zinc-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              aria-label={`Remove ${d.title}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={() => run("Resetting…", () => fetch("/api/reset", { method: "POST" }))}
        className="text-left text-xs text-zinc-500 underline-offset-2 hover:underline"
      >
        Reset to sample knowledge base
      </button>
    </aside>
  );
}
