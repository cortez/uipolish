import { SettingsView } from "@/components/app/settings-view";
import { availableModels } from "@/lib/ai/provider";
import { requireUser } from "@/lib/auth";
import { PAYMENT_METHOD, PLANS, invoices, subscription, team } from "@/lib/sample-billing";
import { usage } from "@/lib/usage";
import { currentWorkspace, preferences } from "@/lib/workspace";

export const metadata = { title: "Settings" };

/* Settings loads its data here and hands it to SettingsView. To use a
   different settings screen, render it here with the same data: nothing
   else in the app imports SettingsView. */

export default async function SettingsPage() {
  const user = await requireUser();
  const [prefs, limits, { workspace }] = await Promise.all([preferences(user.id), usage(user.id), currentWorkspace(user.id)]);
  return (
    <SettingsView
      user={user}
      workspaceName={workspace.name}
      preferences={prefs}
      models={availableModels()}
      billing={{
        plans: PLANS,
        subscription: subscription(),
        paymentMethod: PAYMENT_METHOD,
        invoices: invoices(),
        usage: [
          {
            id: "messages",
            label: "Messages today",
            used: limits.used,
            limit: limits.limit,
            unit: "messages",
            resetsAt: limits.resetsAt.toISOString().slice(0, 10),
            atLimit: "New messages wait until the limit resets.",
          },
        ],
      }}
      team={team(user)}
    />
  );
}
