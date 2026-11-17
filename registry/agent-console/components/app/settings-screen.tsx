"use client";

import { useCallback } from "react";
import { Settings, type ApiKey, type NotificationMatrix, type WorkspaceSettings } from "@/components/ui/settings/settings";
import { FEATURES, LOCALES, MODELS, NOTIFICATION_EVENTS, PLAN, PRODUCT_NAME, SCOPES, TIMEZONES } from "@/lib/product";
import type { SettingsData } from "@/lib/service";
import { useConsole } from "./console-context";
import { Page } from "./page-bar";
import { useResource } from "./use-live";
import styles from "./screens.module.css";

/* Settings: the Settings block for the workspace. Name, URL and time zone,
   API keys, models and the monthly spend limit (which Usage measures
   against), and where notifications go. The save bar saves the draft in
   one call; keys and switches act on their own. */

export function SettingsScreen({ initial, now }: { initial?: SettingsData; now?: number }) {
  const { api, user } = useConsole();
  const fetch = useCallback(() => api.settings(), [api]);
  const { data, setData } = useResource(initial, fetch, 0, "Settings didn’t load.");
  const keys = data?.apiKeys ?? [];
  const matrix = data?.notifications ?? {};
  const setKeys = (change: (list: ApiKey[]) => ApiKey[]) => setData((d) => (d ? { ...d, apiKeys: change(d.apiKeys) } : d));
  const setMatrix = (change: (m: NotificationMatrix) => NotificationMatrix) => setData((d) => (d ? { ...d, notifications: change(d.notifications) } : d));

  return (
    <Page>
      <Settings
        className={styles.settings}
        loading={!data}
        settings={data?.settings ?? EMPTY}
        description={`For everyone in ${data?.settings.name ?? "this workspace"}. You’re ${user.name}, an owner.`}
        product={PRODUCT_NAME}
        onSave={async (patch: Partial<WorkspaceSettings>) => {
          const saved = await api.saveSettings(patch);
          setData((d) => (d ? { ...d, settings: saved } : d));
        }}
        urlPrefix="console.acme.example.com/"
        timezones={TIMEZONES}
        locales={LOCALES}
        apiKeys={keys}
        scopes={SCOPES}
        onCreateKey={async (input) => {
          const created = await api.createKey(input);
          setKeys((list) => [created.key, ...list]);
          return created;
        }}
        onRevokeKey={async (id) => {
          await api.revokeKey(id);
          setKeys((list) => list.filter((k) => k.id !== id));
        }}
        models={MODELS}
        features={FEATURES}
        usage={data ? { spent: data.spent, segments: data.segments, period: "this month" } : undefined}
        plan={PLAN}
        notifications={
          data
            ? {
                events: NOTIFICATION_EVENTS,
                channels: data.channels,
                value: matrix,
                onChange: async (event, channel, on) => {
                  await api.setNotification(event, channel, on);
                  setMatrix((m) => ({ ...m, [event]: { ...m[event], [channel]: on } }));
                },
                onTest: (channel) => api.testNotification(channel),
              }
            : undefined
        }
        now={now}
      />
    </Page>
  );
}

/** Stands in while settings load; the block shows skeletons, not these. */
const EMPTY: WorkspaceSettings = {
  name: "",
  slug: "",
  timezone: "UTC",
  locale: "en-US",
  defaultModel: MODELS[0].id,
  overrides: {},
  spendLimit: 0,
  alertAt: 80,
  requestsPerMinute: 0,
  tokensPerMinute: 0,
};
