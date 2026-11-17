"use client";

import { useState } from "react";
import { AgentSettings, type AgentSettingsValue } from "@/components/ui/agent-settings/agent-settings";
import {
  Billing,
  type BillingInvoice,
  type BillingPaymentMethod,
  type BillingPlan,
  type BillingSubscription,
  type BillingUsage,
} from "@/components/ui/billing/billing";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs/tabs";
import { TeamMembers, type TeamInvite, type TeamMember } from "@/components/ui/team-members/team-members";
import { toast } from "@/components/ui/toast/toast";
import { savePreferences } from "@/app/(app)/actions";
import type { Preferences } from "@/lib/db/store";
import type { ModelOption } from "@/components/ui/model-picker/model-picker";
import { ASSISTANT_NAME } from "@/lib/config";
import { TopBar } from "./top-bar";
import app from "./app.module.css";
import styles from "./settings.module.css";

/* Settings in three tabs, each a kit block: the assistant (Agent
   settings), billing and members. The assistant's settings save to the
   server; billing and members run on sample data in this page's state
   until they're connected (see lib/sample-billing.ts). */

type SettingsViewProps = {
  user: { id: string; name: string; email: string };
  workspaceName: string;
  preferences: Preferences;
  /** What the assistant can run on, from the configured provider. */
  models: ModelOption[];
  billing: {
    plans: BillingPlan[];
    subscription: BillingSubscription;
    paymentMethod: BillingPaymentMethod | null;
    invoices: BillingInvoice[];
    usage: BillingUsage[];
  };
  team: { members: TeamMember[]; invites: TeamInvite[] };
};

export function SettingsView({ user, workspaceName, preferences, models, billing, team }: SettingsViewProps) {
  const [settings, setSettings] = useState<AgentSettingsValue>({ model: preferences.model, remember: preferences.remember });
  const [subscription, setSubscription] = useState(billing.subscription);
  const [members, setMembers] = useState(team.members);
  const [invites, setInvites] = useState(team.invites);

  async function changeSettings(patch: Partial<AgentSettingsValue>) {
    const result = await savePreferences({
      ...(patch.model !== undefined && { model: patch.model }),
      ...(patch.remember !== undefined && { remember: patch.remember }),
    });
    if (!result.ok) throw new Error(result.error);
    setSettings((s) => ({ ...s, ...patch }));
  }

  return (
    <div className={app.page}>
      <TopBar title="Settings" />
      <div className={app.scroll}>
        <div className={styles.content}>
          <Tabs defaultValue="assistant" param="tab">
            <TabList aria-label="Settings">
              <Tab value="assistant">Assistant</Tab>
              <Tab value="billing">Billing</Tab>
              <Tab value="members" count={members.length}>
                Members
              </Tab>
            </TabList>

            <TabPanel value="assistant" className={styles.panel}>
              <AgentSettings
                agent={ASSISTANT_NAME}
                title="Assistant"
                description="How the assistant works for you. Changes save as you make them."
                headingLevel={2}
                sections={["model", "memory"]}
                settings={settings}
                onChange={changeSettings}
                models={models}
                memories={[]}
              />
            </TabPanel>

            <TabPanel value="billing" className={styles.panel}>
              {/* Point each callback at your billing provider: Stripe Checkout for plan
                  changes, its customer portal for the card and cancelling. */}
              <Billing
                headingLevel={2}
                plans={billing.plans}
                subscription={subscription}
                paymentMethod={billing.paymentMethod}
                invoices={billing.invoices}
                usage={billing.usage}
                onChangePlan={(planId, interval) => {
                  setSubscription((s) => ({ ...s, planId, interval }));
                  toast.success("Plan changed");
                }}
                onUpdatePayment={() => {
                  toast("Your billing provider’s card form opens here");
                }}
                onCancel={() => {
                  setSubscription((s) => ({ ...s, status: "canceled", cancelAt: s.periodEnd }));
                  toast("Subscription canceled", { description: `It stays active until ${subscription.periodEnd}.` });
                }}
                onResume={() => setSubscription((s) => ({ ...s, cancelAt: undefined, status: "active" }))}
              />
            </TabPanel>

            <TabPanel value="members" className={styles.panel}>
              <TeamMembers
                workspaceName={workspaceName}
                members={members}
                invites={invites}
                currentUserId={user.id}
                canManage
                seats={{ used: members.length + invites.length, total: subscription.seats }}
                onUpgrade={() => {
                  toast("Add seats from Billing");
                }}
                onInvite={async (emails, role) => {
                  const now = Date.now();
                  setInvites((list) => [
                    ...emails.map((email) => ({ id: `i-${email}`, email, role, sentAt: now, expiresAt: now + 7 * 864e5, invitedBy: user.name })),
                    ...list,
                  ]);
                  toast.success(emails.length === 1 ? "Invite sent" : `${emails.length} invites sent`);
                }}
                onChangeRole={async (id, role) => setMembers((list) => list.map((m) => (m.id === id ? { ...m, role } : m)))}
                onRemove={async (id) => setMembers((list) => list.filter((m) => m.id !== id))}
                onResend={async (id) =>
                  setInvites((list) => list.map((i) => (i.id === id ? { ...i, sentAt: Date.now(), expiresAt: Date.now() + 7 * 864e5 } : i)))
                }
                onRevoke={async (id) => setInvites((list) => list.filter((i) => i.id !== id))}
              />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
