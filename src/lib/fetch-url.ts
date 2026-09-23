import { lookup } from "dns/promises";
import net from "net";
import { htmlToText } from "./text";

const MAX_BYTES = 2_000_000;

function isPrivateAddress(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6 === "::";
}

/**
 * Fetches a public web page and returns readable text. Blocks non-HTTP(S)
 * schemes and private/internal addresses to prevent SSRF.
 */
export async function fetchPageText(rawUrl: string): Promise<{ title: string; text: string; url: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs are allowed.");

  const { address } = await lookup(url.hostname);
  if (isPrivateAddress(address)) throw new Error("Private or internal addresses are not allowed.");

  const res = await fetch(url, {
    redirect: "error",
    headers: { "user-agent": "DocChat/1.0 (+ingestion)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html") && !type.includes("text/plain")) {
    throw new Error("Only HTML or plain-text pages can be imported by URL. Upload PDFs as files.");
  }
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new Error("The page is too large to import.");

  if (type.includes("text/plain")) return { title: url.hostname + url.pathname, text: body, url: url.toString() };
  const { title, text } = htmlToText(body);
  return { title: title || url.hostname + url.pathname, text, url: url.toString() };
}
