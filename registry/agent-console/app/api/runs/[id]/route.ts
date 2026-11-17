import { apiOrNull } from "@/lib/server";

/* GET /api/runs/:id: one run's trace and output, polled while it runs. */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  const detail = await api.run((await params).id);
  return detail ? Response.json(detail) : Response.json({ error: "No run with that id." }, { status: 404 });
}
