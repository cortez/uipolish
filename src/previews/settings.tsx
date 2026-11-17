"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import {
  Settings,
  SettingsError,
  type ApiKey,
  type ApiKeyScope,
  type ModelFeature,
  type ModelOption,
  type NotificationMatrix,
  type SettingsHandle,
  type SettingsSection,
  type WorkspaceSettings,
} from "@registry/settings/settings";
import { Switch } from "@registry/switch/switch";
import { Toaster } from "@registry/toast/toast";
import { AcmeBrand } from "@/components/logo";
import base from "./preview.module.css";
import styles from "./settings.module.css";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const SETTINGS: WorkspaceSettings = {
  name: "Halden Robotics",
  slug: "halden-robotics",
  timezone: "Europe/London",
  locale: "en-GB",
  defaultModel: "pro",
  overrides: { tagging: "lite" },
  spendLimit: 1500,
  alertAt: 80,
  requestsPerMinute: 600,
  tokensPerMinute: 400_000,
};

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "Europe/London", label: "UK Time (London)" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin)" },
  { value: "Asia/Kolkata", label: "India Time (Kolkata)" },
  { value: "Asia/Tokyo", label: "Japan Time (Tokyo)" },
  { value: "Australia/Sydney", label: "Eastern Australia Time (Sydney)" },
];

const LOCALES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "ja-JP", label: "日本語 (日本)" },
];

const MODELS: ModelOption[] = [
  { id: "lite", name: "Acme Lite", description: "Quick and cheap. Fine for tagging, routing and short replies." },
  { id: "pro", name: "Acme Pro", description: "Writes well and uses tools reliably. The one most teams run." },
  { id: "max", name: "Acme Max", description: "Slower and about five times the cost. For long documents and hard reasoning." },
];

const FEATURES: ModelFeature[] = [
  { id: "chat", label: "Chat", description: "Replies in the assistant panel." },
  { id: "runs", label: "Agent runs", description: "Multi-step jobs that call your tools." },
  { id: "tagging", label: "Ticket tagging", description: "Labels and routes each new support ticket." },
];

const SCOPES: ApiKeyScope[] = [
  { value: "read", label: "Read", description: "Runs, files, transcripts and settings." },
  { value: "write", label: "Write", description: "Create and change files and agent instructions." },
  { value: "runs", label: "Start runs", description: "Runs spend from the monthly limit." },
  { value: "usage", label: "Usage", description: "Spend and token counts, for your own dashboards." },
];

function seedKeys(now: number): ApiKey[] {
  return [
    {
      id: "k-prod",
      name: "Production backend",
      last4: "4f2a",
      scopes: ["read", "write", "runs"],
      createdAt: now - 142 * DAY,
      createdBy: "Ines Duarte",
      lastUsedAt: now - 3 * MIN,
      expiresAt: null,
    },
    {
      id: "k-ci",
      name: "GitHub Actions",
      last4: "9c1e",
      scopes: ["read", "runs"],
      createdAt: now - 61 * DAY,
      createdBy: "Theo Marchetti",
      lastUsedAt: now - 2 * HOUR,
      expiresAt: now + 29 * DAY,
    },
    {
      id: "k-grafana",
      name: "Grafana usage panel",
      last4: "b07d",
      scopes: ["usage"],
      createdAt: now - 214 * DAY,
      createdBy: "Priya Raghunathan",
      lastUsedAt: now - 118 * DAY,
      expiresAt: null,
    },
    {
      id: "k-staging",
      name: "Staging worker",
      last4: "e3a9",
      scopes: ["read", "write"],
      createdAt: now - 96 * DAY,
      createdBy: "Theo Marchetti",
      lastUsedAt: now - 7 * DAY,
      expiresAt: now - 6 * DAY,
    },
  ];
}

const NOTIFICATIONS: NotificationMatrix = {
  failed: { email: true, slack: true },
  approval: { email: false, slack: true },
  usage: { email: true, slack: false },
  expiring: { email: true, slack: false },
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function secret() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  return `sk-acme-live-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}

export function SettingsPreview() {
  const [viewer, setViewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [noKeys, setNoKeys] = useState(false);
  const [run, setRun] = useState(0);
  const [now] = useState(() => Date.now());
  const [settings, setSettings] = useState(SETTINGS);
  const [keys, setKeys] = useState(() => seedKeys(now));
  const [logo, setLogo] = useState<string | null>(null);
  const [matrix, setMatrix] = useState(NOTIFICATIONS);
  const [section, setSection] = useState<SettingsSection>("general");
  const [note, setNote] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const slackFailed = useRef(false);
  const handle = useRef<SettingsHandle>(null);
  const failRef = useRef(failNext);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  // Loading settles after a slow network's worth of waiting, unless it's held on.
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 4000);
    return () => window.clearTimeout(t);
  }, [loading]);

  /** A fake request: 0.6 to 1.1s, failing when asked to. */
  async function request(reason: string) {
    await wait(600 + Math.random() * 500);
    if (failRef.current) {
      setFailNext(false);
      throw new Error(reason);
    }
  }

  function reset() {
    setSettings(SETTINGS);
    setKeys(seedKeys(now));
    setLogo(null);
    setMatrix(NOTIFICATIONS);
    setNote(null);
    setDeleted(false);
    setNoKeys(false);
    slackFailed.current = false;
    setRun((r) => r + 1);
  }

  if (deleted) {
    return (
      <div className={base.stack}>
        <div className={styles.gone}>
          <p className={styles.goneTitle}>Halden Robotics was deleted</p>
          <p className={base.note}>In your app, this is where Acme takes people to their other workspaces.</p>
          <Button variant="secondary" onClick={reset}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={base.stack}>
      <div className={styles.controls}>
        <Switch size="sm" label="Viewer" checked={viewer} onCheckedChange={setViewer} />
        <Switch size="sm" label="Loading" checked={loading} onCheckedChange={setLoading} />
        <Switch size="sm" label="Fail the next save" checked={failNext} onCheckedChange={setFailNext} />
        <Switch size="sm" label="No API keys" checked={noKeys} onCheckedChange={setNoKeys} />
      </div>

      <div className={styles.frame}>
        <div className={styles.appBar}>
          <AcmeBrand />
          <Button
            variant="ghost"
            onClick={async () => {
              setNote(null);
              const leave = await handle.current?.confirmLeave();
              setNote(leave ? "Left settings. In your app, this is where the router moves on." : "Stayed on settings.");
            }}
          >
            <Icon name="arrow-left" />
            Back to runs
          </Button>
        </div>

        <Settings
          key={run}
          ref={handle}
          className={styles.settings}
          product="Acme"
          settings={settings}
          canEdit={!viewer}
          permissionNote="Only owners and admins can change them. Ask Ines Duarte or Theo Marchetti."
          loading={loading}
          section={section}
          onSectionChange={setSection}
          now={now}
          urlPrefix="app.acme.ai/"
          timezones={TIMEZONES}
          locales={LOCALES}
          logoUrl={logo}
          onLogoUpload={async (file) => {
            await request(`Couldn’t upload ${file.name}: the connection dropped. Your logo hasn’t changed.`);
            setLogo(URL.createObjectURL(file));
          }}
          onLogoRemove={async () => {
            await request("Couldn’t remove the logo just now. It’s still there; try again.");
            setLogo(null);
          }}
          onDeleteWorkspace={async () => {
            await wait(1200);
            if (failRef.current) {
              setFailNext(false);
              throw new Error("Acme couldn’t delete Halden Robotics: 2 agent runs are still going. Stop them, then try again.");
            }
            setDeleted(true);
          }}
          onSave={async (patch) => {
            await wait(900);
            if (failRef.current) {
              setFailNext(false);
              throw new Error("Acme didn’t answer in time, so nothing was saved. Your changes are still here.");
            }
            if (patch.slug === "halden" || patch.slug === "acme") {
              throw new SettingsError("That URL is taken. Pick another one, then save.", {
                slug: `app.acme.ai/${patch.slug} belongs to another workspace. Try halden-hq or halden-labs`,
              });
            }
            setSettings((s) => ({ ...s, ...patch }));
          }}
          apiKeys={noKeys ? [] : keys}
          scopes={SCOPES}
          onCreateKey={async (input) => {
            await request("Acme couldn’t create the key. Nothing was created; try again.");
            const value = secret();
            const created = Date.now();
            const key: ApiKey = {
              id: `k-${created}`,
              name: input.name,
              last4: value.slice(-4),
              scopes: input.scopes,
              createdAt: created,
              createdBy: "Sam Whitaker",
              lastUsedAt: null,
              expiresAt: input.expiresInDays === null ? null : created + input.expiresInDays * DAY,
            };
            setNoKeys(false);
            setKeys((k) => [key, ...k]);
            return { key, secret: value };
          }}
          onRevokeKey={async (id) => {
            await request("Acme couldn’t revoke the key. It still works; try again.");
            setKeys((k) => k.filter((x) => x.id !== id));
          }}
          models={MODELS}
          features={FEATURES}
          usage={{
            spent: 1184.6,
            period: "this month",
            segments: [
              { id: "runs", label: "Agent runs", value: 702.4 },
              { id: "chat", label: "Chat", value: 318.2 },
              { id: "tagging", label: "Ticket tagging", value: 164 },
            ],
            peakRequestsPerMinute: 212,
            peakTokensPerMinute: 168_000,
          }}
          plan={{ maxSpendLimit: 20_000, maxRequestsPerMinute: 1000, maxTokensPerMinute: 2_000_000 }}
          notifications={{
            events: [
              { id: "failed", label: "Run failed", description: "An agent run stops with an error." },
              { id: "approval", label: "Approval needed", description: "An agent is waiting for someone to approve an action." },
              { id: "usage", label: "Spend alert", description: "This month’s spend passes the threshold set under Models." },
              { id: "expiring", label: "Key expiring", description: "An API key expires within 7 days." },
            ],
            channels: [
              { id: "email", label: "Email", destination: "sam@haldenrobotics.com" },
              { id: "slack", label: "Slack", destination: "#ops-alerts in Halden Robotics" },
            ],
            value: matrix,
            onChange: async (event, channel, on) => {
              await wait(500 + Math.random() * 400);
              // The first Slack change to "Key expiring" fails, so the rollback can be seen.
              if (event === "expiring" && channel === "slack" && !slackFailed.current) {
                slackFailed.current = true;
                throw new Error("Slack refused it: the Acme app was removed from #ops-alerts. Add it back, then try again.");
              }
              if (failRef.current) {
                setFailNext(false);
                throw new Error("");
              }
              setMatrix((m) => ({ ...m, [event]: { ...m[event], [channel]: on } }));
            },
            onTest: async (channel) => {
              await request(
                channel === "slack"
                  ? "Slack didn’t answer. Check that the Acme app is still in #ops-alerts."
                  : "The email bounced. Check the address in your profile.",
              );
            },
          }}
        />
      </div>

      <p className={base.note} aria-live="polite">
        {note ??
          "Change anything in General or Models and the save bar appears; ⌘S saves. Try the URL halden to see a field error from the server. The first Slack switch for Key expiring fails and moves back."}
      </p>
      <Toaster />
    </div>
  );
}
