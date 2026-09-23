import { extractText, getDocumentProxy } from "unpdf";
import { addDocument, listDocuments, removeDocument } from "@/lib/store";
import { fetchPageText } from "@/lib/fetch-url";

export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  void request;
  return Response.json({ documents: await listDocuments() });
}

export async function POST(req: Request) {
  try {
    const type = req.headers.get("content-type") ?? "";

    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (!files.length) return Response.json({ error: "No files received." }, { status: 400 });
      const added = [];
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
        const name = file.name.toLowerCase();
        let text: string;
        if (name.endsWith(".pdf")) {
          const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
          const out = await extractText(pdf, { mergePages: true });
          text = Array.isArray(out.text) ? out.text.join("\n\n") : out.text;
        } else if (/\.(md|markdown|txt|csv|json|html?)$/.test(name)) {
          text = await file.text();
        } else {
          throw new Error(`${file.name}: only PDF, Markdown, TXT, CSV, JSON and HTML files are supported.`);
        }
        const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        added.push(await addDocument(title, file.name, text, "upload"));
      }
      return Response.json({ added });
    }

    const body = (await req.json()) as { url?: string; title?: string; text?: string };
    if (body.url) {
      const page = await fetchPageText(body.url);
      return Response.json({ added: [await addDocument(page.title, page.url, page.text, "url")] });
    }
    if (body.text) {
      const title = body.title?.trim() || body.text.trim().split("\n")[0].slice(0, 60);
      return Response.json({ added: [await addDocument(title, "pasted text", body.text, "text")] });
    }
    return Response.json({ error: "Send files, a url, or text." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Import failed." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  await removeDocument(id);
  return Response.json({ ok: true });
}
