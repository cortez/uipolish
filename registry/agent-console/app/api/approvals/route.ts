import { apiOrNull } from "@/lib/server";

/* GET /api/approvals: every request, in any status. The inbox sorts and filters them. */

export async function GET() {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  return Response.json(await api.approvals());
}
