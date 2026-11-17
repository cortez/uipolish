import { SettingsScreen } from "@/components/app/settings-screen";
import { consoleFor } from "@/lib/server";

export const metadata = { title: "Settings" };

/* Settings loads its data here and hands it to SettingsScreen. To use a
   different settings screen, render it here with the same data: nothing
   else imports SettingsScreen. */

async function load() {
  const { api } = await consoleFor();
  return { initial: await api.settings(), now: Date.now() };
}

export default async function SettingsPage() {
  return <SettingsScreen {...await load()} />;
}
