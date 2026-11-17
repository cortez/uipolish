"use client";

import { useEffect, useRef, useState } from "react";
import {
  AgentSettings,
  type AgentSettingsValue,
  type AllowedTool,
  type MemoryNote,
} from "@registry/agent-settings/agent-settings";
import { Button } from "@registry/button/button";
import type { AddServerState, Connection } from "@registry/connections/connections";
import type { ModelOption } from "@registry/model-picker/model-picker";
import styles from "./preview.module.css";
import { StarMark } from "@/components/logo";

const MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Quick answers to short questions" },
  { id: "balanced", name: "Balanced", description: "Everyday writing, code and analysis" },
  { id: "deep", name: "Deep", description: "Thinks longer on hard problems" },
  {
    id: "long-context",
    name: "Long context",
    description: "Whole cookbooks and long threads. Household plan only.",
    disabled: true,
  },
];

// Made-up logos for the made-up servers.
const ACME = (
  <StarMark />
);

const LEDGER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4.5h10.5a2 2 0 0 1 2 2v13H8a2 2 0 0 1-2-2Z" />
    <path d="M6 17.5a2 2 0 0 1 2-2h10.5M10 8.5h5M10 11.5h3" />
  </svg>
);

const POSTBOX = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
    <path d="m5 7 7 5.5L19 7" />
  </svg>
);

const ACCOUNT = "mara@saturdaysupper.example.com";

const SERVERS: Connection[] = [
  {
    id: "acme",
    name: "Acme",
    host: "mcp.acme.example.com",
    mark: ACME,
    status: "connected",
    tools: [
      { name: "list_bookings", description: "Guests, seats and dietary notes for a supper" },
      { name: "get_menu", description: "A supper’s menu, with allergens" },
      { name: "update_menu", description: "Change the dishes on a menu" },
      { name: "delete_menu", description: "Delete a draft menu" },
      { name: "add_to_list", description: "Add items to a shopping list" },
    ],
    granted: ["Read your bookings and recipes", "Change menus and shopping lists"],
    account: ACCOUNT,
  },
  {
    id: "ledger",
    name: "Ledger",
    host: "mcp.ledger.example.com",
    mark: LEDGER,
    status: "connected",
    tools: [
      { name: "list_payments", description: "Payments from guests, newest first" },
      { name: "get_balance", description: "What’s waiting to be paid out" },
      { name: "refund_payment", description: "Refund a guest, up to what they paid" },
    ],
    granted: ["Read payments and payouts", "Refund up to what a guest paid"],
    account: ACCOUNT,
  },
  {
    id: "postbox",
    name: "Postbox",
    host: "mcp.postbox.example.net",
    mark: POSTBOX,
    status: "needs-auth",
    tools: [
      { name: "list_threads", description: "Guest messages, newest first" },
      { name: "read_thread", description: "Every message in one conversation" },
      { name: "send_message", description: "Reply from your Postbox address" },
    ],
    granted: ["Read guest messages", "Send messages from your Postbox address"],
    account: ACCOUNT,
  },
];

const ALLOWED: AllowedTool[] = [
  { id: "acme-list_bookings", server: "Acme", tool: "list_bookings", effect: "read", description: "Guests, seats and dietary notes for a supper" },
  { id: "acme-get_menu", server: "Acme", tool: "get_menu", effect: "read", description: "A supper’s menu, with allergens" },
  { id: "acme-add_to_list", server: "Acme", tool: "add_to_list", effect: "change", description: "Add items to a shopping list" },
  { id: "ledger-list_payments", server: "Ledger", tool: "list_payments", effect: "read", description: "Payments from guests, newest first" },
  { id: "ledger-get_balance", server: "Ledger", tool: "get_balance", effect: "read", description: "What’s waiting to be paid out" },
  { id: "postbox-read_thread", server: "Postbox", tool: "read_thread", effect: "read", description: "Every message in one conversation" },
];

const MEMORIES: MemoryNote[] = [
  { id: "m1", text: "Supper is on Saturdays at 7:30, at 14 Alder Lane." },
  { id: "m2", text: "Ben Ito is vegetarian and brings the bread." },
  { id: "m3", text: "The long table seats 12." },
  { id: "m4", text: "Mara signs guest messages “Mara”, and keeps them short." },
  { id: "m5", text: "Refunds are in full up to 3 days before a supper." },
];

const SETTINGS: AgentSettingsValue = {
  model: "balanced",
  policy: { read: "allow", change: "ask" },
  dailyLimit: 10,
  remember: true,
};

/** Ledger turns down anything above this. */
const LEDGER_CAP = 200;

function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  return {
    later(fn: () => void, ms: number) {
      timers.current.push(window.setTimeout(fn, ms));
    },
    clear() {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
  };
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function AgentSettingsPreview() {
  const [settings, setSettings] = useState(SETTINGS);
  const [servers, setServers] = useState(SERVERS);
  const [add, setAdd] = useState<AddServerState>({ status: "idle" });
  const [allowed, setAllowed] = useState(ALLOWED);
  const [memories, setMemories] = useState(MEMORIES);
  const [run, setRun] = useState(0);
  const timers = useTimers();

  function patchServer(id: string, change: Partial<Connection>) {
    setServers((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }

  function connect(id: string, ms: number) {
    patchServer(id, { status: "connecting", message: undefined });
    timers.later(() => patchServer(id, { status: "connected" }), ms);
  }

  // Saves land after a short wait, like a real server. Ledger turns down big limits.
  async function onChange(patch: Partial<AgentSettingsValue>) {
    const before = settings;
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.dailyLimit !== undefined && patch.dailyLimit > LEDGER_CAP) {
      await wait(800);
      setSettings((s) => ({ ...s, dailyLimit: before.dailyLimit }));
      throw new Error(`Ledger caps Copper at $${LEDGER_CAP}.00 a day. Raise the cap in Ledger first.`);
    }
    await wait(200);
  }

  function startOver() {
    timers.clear();
    setSettings(SETTINGS);
    setServers(SERVERS);
    setAdd({ status: "idle" });
    setAllowed(ALLOWED);
    setMemories(MEMORIES);
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <AgentSettings
        key={run}
        agent="Copper"
        headingLevel={2}
        description="Mara Okafor’s agent for the Saturday supper club."
        settings={settings}
        onChange={onChange}
        models={MODELS}
        connections={{
          servers,
          add,
          onAdd: (url) => {
            const host = new URL(url).host;
            setAdd({ status: "checking", url });
            timers.later(() => {
              setAdd({ status: "idle" });
              const id = `${host}-${Date.now()}`;
              const word = host.split(".").find((p) => !["mcp", "www"].includes(p)) ?? host;
              const name = word.charAt(0).toLocaleUpperCase() + word.slice(1);
              setServers((all) => [...all, { id, name, host, status: "connecting", account: ACCOUNT }]);
              timers.later(() => patchServer(id, { status: "connected", tools: [] }), 1100);
            }, 1200);
          },
          onCancelAdd: () => setAdd({ status: "idle" }),
          onToggle: (id, on) => (on ? connect(id, 1200) : patchServer(id, { status: "disabled" })),
          onReconnect: (id) => connect(id, 1600),
          onRetry: (id) => connect(id, 1400),
          onDisconnect: (id) =>
            new Promise<void>((resolve) =>
              timers.later(() => {
                setServers((all) => all.filter((s) => s.id !== id));
                resolve();
              }, 700),
            ),
        }}
        allowed={allowed}
        onRevoke={(tool) => setAllowed((all) => all.filter((t) => t.id !== tool.id))}
        onRestore={(tool) =>
          setAllowed((all) => {
            // Back where it was.
            const at = ALLOWED.findIndex((t) => t.id === tool.id);
            const next = all.filter((t) => t.id !== tool.id);
            const index = next.findIndex((t) => ALLOWED.findIndex((a) => a.id === t.id) > at);
            next.splice(index === -1 ? next.length : index, 0, tool);
            return next;
          })
        }
        effectNotes={{
          read: "Looking up bookings, menus and payments. Nothing changes.",
          change: "Editing menus and shopping lists, which you can change back.",
          send: "Messages to guests can’t be taken back once they’re out, so Copper always asks.",
          delete: "Cancelled bookings and deleted menus don’t come back, so Copper always asks.",
          spend: "Refunds and payments move money the moment they run, so Copper always asks.",
        }}
        spending={{
          used: 3.4,
          segments: [
            { id: "planning", label: "Menu planning", value: 1.85 },
            { id: "shopping", label: "Shopping list", value: 0.95 },
            { id: "messages", label: "Messages to guests", value: 0.6 },
          ],
        }}
        memories={memories}
        onClearMemory={() => wait(900).then(() => setMemories([]))}
      />

      <section className={styles.group}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <p className={styles.note}>
            Saves land after a short wait, like a real server. Ledger turns down daily limits over $200.00. A revoked
            tool keeps Undo for six seconds after you move away from it.
          </p>
          <Button variant="secondary" onClick={startOver} data-demo-controls="">
            Start over
          </Button>
        </div>
      </section>
    </div>
  );
}
