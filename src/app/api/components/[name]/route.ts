import { componentDetail } from "@/lib/api/catalog";
import { apiError, json, methodNotAllowed, preflight } from "@/lib/api/respond";
import { count } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const query = new URL(request.url).searchParams;
  const stack = query.get("stack");
  if (stack && stack !== "react") {
    return apiError(400, "unsupported_stack", `Stack "${stack}" isn't supported.`, "Leave stack out, or pass stack=react.");
  }

  const tailwind = query.get("tailwind");
  if (tailwind && tailwind !== "true" && tailwind !== "false") {
    return apiError(400, "invalid_parameter", `tailwind must be true or false, not "${tailwind}".`, "Pass tailwind=true for a Tailwind CSS v4 project, or leave it out.");
  }

  const result = await componentDetail(name, { tailwind: tailwind === "true" });
  if (result.status === "ok") {
    count("api.component", `component.${name}.served`, ...(tailwind === "true" ? ["component.tailwind"] : []));
    return json(result.body);
  }
  return apiError(404, "component_not_found", `No component named "${name}".`, "Use a name from GET /api/components.", {
    available: result.names,
  });
}

export { preflight as OPTIONS, methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH, methodNotAllowed as DELETE };
