"use client";

import { Fragment, type ReactNode } from "react";

/** Renders a tiny Markdown subset (paragraphs, bullets, numbered lists, **bold**, `code`) with [n] citation chips. */
export function RichText({ text, onCite }: { text: string; onCite?: (n: number) => void }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isBullets = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const isNumbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (isBullets || isNumbered) {
          const Tag = isNumbered ? "ol" : "ul";
          return (
            <Tag key={i} className={`${isNumbered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), onCite)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""), onCite)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string, onCite?: (n: number) => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[\d+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`"))
      out.push(
        <code key={key++} className="rounded bg-black/5 px-1 py-0.5 text-[0.9em] dark:bg-white/10">
          {tok.slice(1, -1)}
        </code>,
      );
    else {
      const n = Number(tok.slice(1, -1));
      out.push(
        <button
          key={key++}
          type="button"
          onClick={() => onCite?.(n)}
          className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-teal-600/10 px-1 align-text-top text-[11px] font-semibold text-teal-700 hover:bg-teal-600/20 dark:text-teal-300"
          aria-label={`Show source ${n}`}
        >
          {n}
        </button>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
