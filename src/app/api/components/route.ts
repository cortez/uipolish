import { componentList } from "@/lib/api/catalog";
import { CACHED, json, methodNotAllowed, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";

export async function GET() {
  return json({ components: await componentList() }, { headers: CACHED });
}

export { preflight as OPTIONS, methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
