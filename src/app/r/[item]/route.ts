import { apiError, json, preflight } from "@/lib/api/respond";
import { abs } from "@/lib/seo/site";
import { registryIndex, registryItem } from "@/lib/shadcn";
import { count } from "@/lib/stats";

export const runtime = "nodejs";

// The shadcn CLI: `npx shadcn add https://uipolish.com/r/button.json`, or
// with the @uipolish registry in components.json, `npx shadcn add @uipolish/button`.

export async function GET(request: Request, { params }: { params: Promise<{ item: string }> }) {
  const file = (await params).item;
  if (!file.endsWith(".json")) return apiError(404, "not_found", `No registry file "${file}".`, "Registry files end in .json, e.g. /r/button.json.");
  const name = file.slice(0, -".json".length);

  if (name === "registry") {
    return json(await registryIndex(), { headers: { "cache-control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } });
  }

  const result = await registryItem(name, new URL(request.url).origin);
  if (result.status === "not_found") {
    return apiError(404, "component_not_found", `No registry item named "${name}".`, `See ${abs("/r/registry.json")} for every item.`);
  }
  count("registry.item", `component.${name}.registry`);
  return json(result.item, { headers: { "cache-control": "public, max-age=300" } });
}

export const OPTIONS = preflight;
