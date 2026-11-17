import { apiOrNull } from "@/lib/coding/server";

/* GET /api/sessions/:id: one session as it is now. The screens watch its
   events instead (./events); this is for scripts and your own tools. */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  const session = await api.session((await params).id);
  if (!session) return Response.json({ error: "There’s no session with that id in this workspace." }, { status: 404 });
  return Response.json(session);
}
