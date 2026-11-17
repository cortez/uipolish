import { encodeEvent } from "@/lib/coding/session";
import { apiOrNull } from "@/lib/coding/server";

/* GET /api/sessions/:id/events: the session as it is, then every change to
   it as it happens, one JSON object per line (lib/coding/session.ts,
   SessionEvent). Every open tab of a session reads one, so a teammate's
   prompt, the agent's steps and a merge show everywhere at once. */

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  const { id } = await params;
  if (!(await api.session(id))) return Response.json({ error: "There’s no session with that id in this workspace." }, { status: 404 });

  const encoder = new TextEncoder();
  let stop = () => {};
  let ping: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (line: string) => {
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          stop();
        }
      };
      stop = api.watch(
        id,
        (event) => send(encodeEvent(event)),
        (message) => {
          send(encodeEvent({ type: "error", message, at: Date.now() }));
          controller.close();
        },
      );
      // A blank line now and then keeps proxies from closing a quiet stream.
      ping = setInterval(() => send("\n"), 25_000);
      request.signal.addEventListener("abort", () => {
        stop();
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    cancel() {
      stop();
      clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
