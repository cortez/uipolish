import { abs } from "@/lib/seo/site";

// The REST API answers in JSON, errors included: an agent can always parse
// the body, read a stable code to branch on, and follow the hint to fix the
// request. The shape is the ApiError schema in /openapi.json.

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
};

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...CORS, "cache-control": "no-store", ...init.headers },
  });
}

export type ErrorCode =
  | "not_found"
  | "method_not_allowed"
  | "component_not_found"
  | "topic_not_found"
  | "unsupported_stack"
  | "invalid_parameter"
  | "unauthorized";

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  hint: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return json({ error: { code, message, hint, docs: abs("/openapi.json"), ...extra } }, { status, headers });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });

/** Every route here is read-only. */
export const methodNotAllowed = () =>
  apiError(405, "method_not_allowed", "This endpoint only answers GET.", "Send a GET request. The API is read-only.", {}, { allow: "GET, OPTIONS" });
