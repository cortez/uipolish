import { apiOrNull } from "@/lib/server";

/* GET /api/knowledge: sources, usage, connected apps and the current batch. */

export async function GET() {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  return Response.json(await api.knowledge());
}
