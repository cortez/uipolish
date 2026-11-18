import { apiError, preflight } from "@/lib/api/respond";

// Anything under /api that isn't an endpoint gets a JSON 404, not the HTML
// page, so an agent can always parse what came back.
const notFound = (request: Request) =>
  apiError(404, "not_found", `No endpoint at ${new URL(request.url).pathname}.`, "See /openapi.json for every endpoint.");

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, preflight as OPTIONS };
