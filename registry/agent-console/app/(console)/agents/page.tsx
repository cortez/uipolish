import { AgentsScreen } from "@/components/app/agents-screen";
import { consoleFor } from "@/lib/server";

export const metadata = { title: "Agents" };

/* Every agent, with today's spend. The open one is ?agent=. */

export default async function AgentsPage() {
  const { api } = await consoleFor();
  return <AgentsScreen initial={await api.agents()} />;
}
