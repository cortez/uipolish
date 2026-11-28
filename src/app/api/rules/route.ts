import { ruleTopics } from "@/lib/api/catalog";
import { CACHED, json, methodNotAllowed, preflight } from "@/lib/api/respond";
import { abs } from "@/lib/seo/site";

export const runtime = "nodejs";

export async function GET() {
  const topics = await ruleTopics();
  return json({ topics: topics.map((topic) => ({ topic, url: abs(`/api/rules/${topic}`) })) }, { headers: CACHED });
}

export { preflight as OPTIONS, methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
