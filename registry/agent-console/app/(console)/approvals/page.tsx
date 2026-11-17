import { ApprovalsScreen } from "@/components/app/approvals-screen";
import { consoleFor } from "@/lib/server";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const { api } = await consoleFor();
  return <ApprovalsScreen initial={await api.approvals()} />;
}
