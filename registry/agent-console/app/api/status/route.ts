import { apiOrNull } from "@/lib/server";

/* GET /api/status: what the sidebar counts (approvals waiting, runs running). */

export async function GET() {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  return Response.json(await api.status());
}
