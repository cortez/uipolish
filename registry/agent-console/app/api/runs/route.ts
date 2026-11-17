import type { RunFilters } from "@/components/ui/run-history/run-history";
import { apiOrNull } from "@/lib/server";
import { DEFAULT_RUN_FILTERS } from "@/lib/service";

/* GET /api/runs?query=&status=&agent=&trigger=&range=&from=&to=&page=
   One page of runs, newest first. The Runs screen polls it while it's open. */

export async function GET(request: Request) {
  const api = await apiOrNull();
  if (!api) return Response.json({ error: "Sign in again." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const filters = Object.fromEntries(
    Object.keys(DEFAULT_RUN_FILTERS).map((key) => [key, params.get(key) ?? DEFAULT_RUN_FILTERS[key as keyof RunFilters]]),
  ) as RunFilters;
  for (const key of ["from", "to"] as const) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  return Response.json(await api.runs({ filters, page: Number(params.get("page")) || 1 }));
}
