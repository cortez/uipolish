import { UsageScreen } from "@/components/app/usage-screen";
import { consoleFor } from "@/lib/server";

export const metadata = { title: "Usage" };

export default async function UsagePage() {
  const { api } = await consoleFor();
  return <UsageScreen initial={await api.usage()} />;
}
