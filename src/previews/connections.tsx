"use client";

import { useEffect, useRef, useState } from "react";
import { Connections, type AddServerState, type Connection, type ConnectionTool } from "@registry/connections/connections";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import { StarMark } from "@/components/logo";

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

const ACME_TOOLS: ConnectionTool[] = [
  { name: "list_bookings", description: "Guests, seats and dietary notes for a supper" },
  { name: "create_booking", description: "Add a guest to a supper" },
  { name: "cancel_booking", description: "Cancel a booking and free its seats" },
  { name: "get_menu", description: "A supper’s menu, with allergens" },
  { name: "update_menu", description: "Change the dishes on a menu" },
  { name: "list_recipes", description: "Recipes, scaled to the guest count" },
  { name: "get_shopping_list", description: "What to buy for a supper" },
  { name: "add_to_list", description: "Add items to a shopping list" },
  { name: "remove_from_list", description: "Take items off a shopping list" },
  { name: "mark_bought", description: "Tick items off as they’re bought" },
  { name: "list_suppliers", description: "Grocers and butchers you order from" },
  { name: "check_stock", description: "What a supplier has in stock today" },
];

const LEDGER_TOOLS: ConnectionTool[] = [
  { name: "list_payments", description: "Payments from guests, newest first" },
  { name: "get_balance", description: "What’s waiting to be paid out" },
  { name: "list_payouts", description: "Payouts to your bank account" },
  { name: "refund_payment", description: "Refund a guest, up to what they paid" },
  { name: "create_invoice", description: "Invoice a guest for a private supper" },
  { name: "list_invoices", description: "Invoices and whether they’re paid" },
];

const POSTBOX_TOOLS: ConnectionTool[] = [
  { name: "list_threads", description: "Guest messages, newest first" },
  { name: "read_thread", description: "Every message in one conversation" },
  { name: "send_message", description: "Reply from your Postbox address" },
];

const ACCOUNT = "mara@saturdaysupper.example.com";

const START: Connection[] = [
  {
    id: "acme",
    name: "Acme",
    host: "mcp.acme.example.com",
    mark: ACME,
    status: "connected",
    tools: ACME_TOOLS,
    granted: ["Read your bookings and recipes", "Change menus and shopping lists"],
    account: ACCOUNT,
  },
  {
    id: "ledger",
    name: "Ledger",
    host: "mcp.ledger.example.com",
    mark: LEDGER,
    status: "needs-auth",
    tools: LEDGER_TOOLS,
    granted: ["Read payments and payouts", "Refund up to what a guest paid"],
    account: ACCOUNT,
  },
  {
    id: "postbox",
    name: "Postbox",
    host: "mcp.postbox.example.net",
    mark: POSTBOX,
    status: "error",
    message: "mcp.postbox.example.net didn’t answer within 10 seconds.",
    granted: ["Read guest messages", "Send messages from your Postbox address"],
    account: ACCOUNT,
  },
  {
    id: "cellar",
    name: "Cellar",
    host: "cellar.example.org",
    status: "disabled",
    tools: [
      { name: "list_wines", description: "Bottles on hand, by shelf" },
      { name: "suggest_pairing", description: "A wine for each course" },
      { name: "reserve_bottles", description: "Hold bottles for a supper" },
      { name: "log_opened", description: "Record what was poured" },
    ],
    granted: ["Read your cellar", "Reserve bottles"],
    account: ACCOUNT,
  },
];

function nameFrom(host: string) {
  const parts = host.split(".").filter((p) => !["mcp", "www", "example", "com", "org", "net"].includes(p));
  const word = parts[0] ?? host;
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

export function ConnectionsPreview() {
  const [servers, setServers] = useState(START);
  const [add, setAdd] = useState<AddServerState>({ status: "idle" });
  const [run, setRun] = useState(0);
  const timers = useRef<number[]>([]);
  const addTimer = useRef(0);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      clearTimeout(addTimer.current);
    };
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function patch(id: string, change: Partial<Connection>) {
    setServers((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }

  // Connecting takes a moment, then lands.
  function connect(id: string, ms: number, then: Partial<Connection> = {}) {
    patch(id, { status: "connecting", message: undefined });
    later(() => patch(id, { status: "connected", ...then }), ms);
  }

  function onAdd(url: string) {
    const host = new URL(url).host;
    setAdd({ status: "checking", url });
    clearTimeout(addTimer.current);
    addTimer.current = window.setTimeout(() => {
      if (host.includes("down")) {
        setAdd({ status: "failed", url, error: `${host} didn’t answer within 10 seconds. Check the address, or try again later.` });
        return;
      }
      const name = nameFrom(host);
      setAdd({ status: "signing-in", url, name, signInUrl: `https://${host}/authorize?client=copper` });
      // Stands in for Mara allowing Copper in the other tab.
      addTimer.current = window.setTimeout(() => {
        const id = `${host}-${Date.now()}`;
        setAdd({ status: "idle" });
        setServers((all) => [
          ...all,
          {
            id,
            name,
            host,
            status: "connecting",
            granted: ["Read your orders", "Place orders up to $200"],
            account: ACCOUNT,
          },
        ]);
        later(
          () =>
            patch(id, {
              status: "connected",
              tools: [
                { name: "search_products", description: "Find produce by name or season" },
                { name: "place_order", description: "Order for delivery on a date" },
                { name: "track_order", description: "Where an order is now" },
              ],
            }),
          1100,
        );
      }, 4000);
    }, 1200);
  }

  function again() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    clearTimeout(addTimer.current);
    setServers(START);
    setAdd({ status: "idle" });
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <h2 className={styles.label}>Copper’s connections</h2>
          <Button variant="secondary" onClick={again}>
            Start over
          </Button>
        </div>
        <Connections
          key={run}
          agent="Copper"
          servers={servers}
          add={add}
          onAdd={onAdd}
          onCancelAdd={() => {
            clearTimeout(addTimer.current);
            setAdd({ status: "idle" });
          }}
          onToggle={(id, on) => (on ? connect(id, 1200) : patch(id, { status: "disabled" }))}
          onReconnect={(id) => connect(id, 1600)}
          onRetry={(id) => connect(id, 1400, id === "postbox" ? { tools: POSTBOX_TOOLS } : {})}
          onDisconnect={(id) =>
            new Promise<void>((resolve) =>
              later(() => {
                setServers((all) => all.filter((s) => s.id !== id));
                resolve();
              }, 700),
            )
          }
        />
        <p className={styles.note}>
          Add mcp.market.example.com to see sign-in, or mcp.down.example.com to see a server that doesn’t answer.
          Sign-in finishes on its own after four seconds.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Nothing connected yet</h2>
        <Connections agent="Copper" servers={[]} onAdd={() => {}} />
      </section>
    </div>
  );
}
