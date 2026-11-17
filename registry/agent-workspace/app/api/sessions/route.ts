import { apiOrNull } from "@/lib/coding/server";

/* GET /api/sessions: the sidebar's sessions, newest activity first, with
   who they're shared with and whether the agent is working. Polled while
   the app is open. */

export async function GET() {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  return Response.json(await api.sessions());
}
