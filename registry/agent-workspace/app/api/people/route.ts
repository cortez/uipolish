import { apiOrNull } from "@/lib/coding/server";

/* GET /api/people: everyone in the workspace, with their presence, for the
   sidebar's Team and the composer's mentions. */

export async function GET() {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  return Response.json(await api.people());
}
