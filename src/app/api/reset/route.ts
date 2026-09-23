import { resetStore, listDocuments } from "@/lib/store";

export const maxDuration = 60;

export async function POST() {
  await resetStore();
  return Response.json({ documents: await listDocuments() });
}
