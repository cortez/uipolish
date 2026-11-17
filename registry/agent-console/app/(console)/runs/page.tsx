import { RunsScreen } from "@/components/app/runs-screen";
import { consoleFor } from "@/lib/server";
import { DEFAULT_RUN_FILTERS } from "@/lib/service";

export const metadata = { title: "Runs" };

/* The first page of runs and the agent names, so the table paints with the
   page; RunsScreen polls from there. The open run is ?run=. */

async function load() {
  const { api } = await consoleFor();
  const [page, agents] = await Promise.all([api.runs({ filters: DEFAULT_RUN_FILTERS, page: 1 }), api.agents()]);
  return { page, agents: agents.map((a) => ({ id: a.id, name: a.name })), at: Date.now() };
}

export default async function RunsPage() {
  return <RunsScreen initial={await load()} />;
}
