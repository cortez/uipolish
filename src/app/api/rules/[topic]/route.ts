import { rule, ruleTopics } from "@/lib/api/catalog";
import { apiError, json, methodNotAllowed, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const found = await rule(topic);
  if (!found) {
    return apiError(404, "topic_not_found", `No rules topic "${topic}".`, "Use a topic from GET /api/rules.", {
      available: await ruleTopics(),
    });
  }
  return json({ topic, ...found });
}

export { preflight as OPTIONS, methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
