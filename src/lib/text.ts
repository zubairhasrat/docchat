const STOPWORDS = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its of on or our so that the their them then there these they this to up was we what when where which who why will with you your".split(
    " ",
  ),
);

/** Lowercase word tokens without stopwords; used for BM25. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:[.'-][a-z0-9]+)*/g) ?? []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t),
  );
}

export function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Splits text into overlapping chunks on paragraph and sentence boundaries.
 * Sizes are in characters to stay provider-agnostic (~4 chars per token).
 */
export function chunkText(
  text: string,
  { maxChars = 1200, overlap = 200 }: { maxChars?: number; overlap?: number } = {},
): string[] {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];
  const units = clean
    .split(/\n\n+/)
    .flatMap((p) => (p.length > maxChars ? p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p] : [p]))
    .map((u) => u.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    // A single unit longer than maxChars gets hard-split.
    if (unit.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < unit.length; i += maxChars - overlap) {
        chunks.push(unit.slice(i, i + maxChars));
      }
      continue;
    }
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      const tail = current.slice(-overlap);
      const cut = tail.indexOf(" ");
      current = `${cut >= 0 ? tail.slice(cut + 1) : tail}\n\n${unit}`.trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Strips HTML to readable text (scripts, styles and nav removed). */
export function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return { title: decodeEntities(title), text: normalizeWhitespace(body) };
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}
