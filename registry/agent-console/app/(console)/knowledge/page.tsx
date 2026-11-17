import { KnowledgeScreen } from "@/components/app/knowledge-screen";
import { consoleFor } from "@/lib/server";

export const metadata = { title: "Knowledge" };

async function load() {
  const { api } = await consoleFor();
  return { initial: await api.knowledge(), now: Date.now() };
}

export default async function KnowledgePage() {
  return <KnowledgeScreen {...await load()} />;
}
