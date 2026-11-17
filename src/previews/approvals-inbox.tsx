"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ApprovalsInbox,
  type ApprovalRequest,
  type ApprovalRequester,
} from "@registry/approvals-inbox/approvals-inbox";
import { BrandMark } from "@registry/brand-marks/brand-marks";
import { Select } from "@registry/select/select";
import { Switch } from "@registry/switch/switch";
import { Toaster } from "@registry/toast/toast";
import base from "./preview.module.css";
import styles from "./approvals-inbox.module.css";

type View = "admin" | "expiring" | "viewer" | "empty" | "loading" | "error";

const VIEWS: { value: View; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Nine waiting, from people and agents" },
  { value: "expiring", label: "Due now", description: "The open request is due in 20 seconds" },
  { value: "viewer", label: "Viewer", description: "Can read, can’t approve" },
  { value: "empty", label: "All caught up", description: "Nothing pending, history kept" },
  { value: "loading", label: "Loading", description: "First load, slow network" },
  { value: "error", label: "Error", description: "Requests couldn’t load" },
];

const ME = "Sam Whitaker";
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const MAYA: ApprovalRequester = { id: "maya", name: "Maya Lindqvist", detail: "Sales" };
const JONAS: ApprovalRequester = { id: "jonas", name: "Jonas Becker", detail: "Sales" };
const THEO: ApprovalRequester = { id: "theo", name: "Theo Marchetti", detail: "Design" };
const DANA: ApprovalRequester = { id: "dana", name: "Dana Whitfield", detail: "Finance" };
const HANNAH: ApprovalRequester = { id: "hannah", name: "Hannah Ibarra", detail: "Finance" };
const GRACE: ApprovalRequester = { id: "grace", name: "Grace Okafor", detail: "Marketing" };
const OLU: ApprovalRequester = { id: "olu", name: "Olu Bankole", detail: "Customer success" };
const SUPPORT: ApprovalRequester = { id: "support-agent", name: "Support agent", detail: "Drafts refunds and replies", kind: "agent" };
const OPS: ApprovalRequester = { id: "ops-agent", name: "Ops agent", detail: "Watches production", kind: "agent" };

const amountUpTo = (max: number, what: string) => (value: string) => {
  const n = Number(value.replace(/[$,\s]/g, ""));
  if (!value.trim() || !Number.isFinite(n) || n <= 0) return "Enter an amount, like 240.00";
  if (n > max) return `Can’t be more than $${max.toLocaleString("en-US", { minimumFractionDigits: 2 })}, ${what}`;
  return null;
};

const POST =
  "Release notes now write themselves. Connect a repo, pick a range of commits, and Acme drafts notes your customers can read, each change linked to its pull request.\n\nFree on every plan from today.";

function seed(now: number, view: View): ApprovalRequest[] {
  const pending: ApprovalRequest[] = [
    {
      id: "r-discount",
      requester: JONAS,
      title: "Approve a 22% discount for Halden & Co",
      context: "Deal · 3-year Business plan, 120 seats",
      priority: "high",
      status: "pending",
      requestedAt: now - 25 * MIN,
      expiresAt: view === "expiring" ? now + 20 * SEC : now + 42 * MIN,
      note: "They have a competing offer at 20% and sign today if we match it with a 3-year term. Above 15% needs a director’s sign-off.",
      preview: {
        kind: "details",
        rows: [
          { label: "Customer", value: "Halden & Co" },
          { label: "Plan", value: "Business, 3 years" },
          { label: "Seats", value: "120" },
          { label: "Discount", from: "10%", value: "22%" },
          { label: "Annual value", from: "$77,760", value: "$67,392" },
          { label: "Contract value", value: "$202,176 over 3 years" },
        ],
      },
      fields: [
        {
          key: "discount",
          label: "Discount (%)",
          value: "22",
          inputMode: "decimal",
          hint: "Up to 30%. Above that goes to the CFO.",
          validate: (v) => {
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 && n <= 30 ? null : "Enter a number from 0 to 30";
          },
        },
      ],
    },
    {
      id: "r-refund",
      requester: SUPPORT,
      title: "Refund $240.00 to Northwind Traders",
      context: "Ticket #8812 · duplicate charge",
      priority: "medium",
      status: "pending",
      requestedAt: now - 40 * MIN,
      expiresAt: now + 3 * HOUR,
      note: "Northwind’s card was charged twice for October, two minutes apart, after the first attempt timed out. This refunds the second charge. Payouts close at 3:00 PM.",
      preview: {
        kind: "payment",
        direction: "refund",
        amount: 240,
        currency: "USD",
        counterparty: "Northwind Traders",
        method: "Visa ending 4417",
        memo: "Acme · duplicate charge for October",
      },
      tool: {
        server: "payments",
        name: "refunds.create",
        arguments: { charge: "ch_3QpL2eNorthwind04", amount: 24000, currency: "usd", reason: "duplicate", metadata: { ticket: 8812 } },
      },
      fields: [{ key: "amount", label: "Refund amount", value: "240.00", inputMode: "decimal", hint: "Up to $240.00, the second charge", validate: amountUpTo(240, "the second charge") }],
    },
    {
      id: "r-expenses",
      requester: MAYA,
      title: "Reimburse $1,284.50 in travel expenses",
      context: "Expense report EXP-2291 · Northwind renewal",
      status: "pending",
      requestedAt: now - 1 * HOUR - 10 * MIN,
      note: "Three days onsite with Northwind for the renewal. Receipts are on the report; the hotel was the one they booked for us.",
      preview: {
        kind: "details",
        rows: [
          { label: "Flights", value: "$642.00" },
          { label: "Hotel, 3 nights", value: "$486.00" },
          { label: "Meals", value: "$112.50" },
          { label: "Taxis", value: "$44.00" },
          { label: "Total", value: "$1,284.50" },
          { label: "Policy", value: "Within the travel policy" },
        ],
      },
      fields: [{ key: "amount", label: "Amount to reimburse", value: "1284.50", inputMode: "decimal", validate: amountUpTo(1284.5, "the report’s total") }],
    },
    {
      id: "r-time-off",
      requester: THEO,
      title: "Time off, Nov 24 to Nov 28",
      context: "Paid time off · 5 days",
      status: "pending",
      requestedAt: now - 2 * HOUR,
      expiresAt: now + 2 * DAY,
      note: "My sister’s wedding in Lisbon. Priya has agreed to cover design reviews that week.",
      preview: {
        kind: "details",
        rows: [
          { label: "Dates", value: "Mon, Nov 24 to Fri, Nov 28" },
          { label: "Type", value: "Paid time off" },
          { label: "Balance", from: "16 days", value: "11 days" },
          { label: "Cover", value: "Priya Raghunathan" },
        ],
      },
    },
    {
      id: "r-access",
      requester: DANA,
      title: "Admin access to the Billing workspace",
      context: "Access request · for 30 days",
      priority: "high",
      status: "pending",
      requestedAt: now - 3 * HOUR,
      expiresAt: now + 5 * HOUR,
      note: "I’m covering invoicing while Ada is on leave. Admin is the lowest role that can issue credits.",
      preview: {
        kind: "details",
        rows: [
          { label: "Person", value: "Dana Whitfield" },
          { label: "Email", value: "dana.whitfield@acme.co", mono: true },
          { label: "Workspace", value: "Billing" },
          { label: "Role", from: "Member", value: "Admin" },
          { label: "Ends", value: "In 30 days, unless someone renews it" },
        ],
      },
    },
    {
      id: "r-post",
      requester: GRACE,
      title: "Post the release notes launch on X",
      context: "@acme · scheduled for 4:00 PM",
      status: "pending",
      requestedAt: now - 4 * HOUR,
      expiresAt: now + 6 * HOUR,
      note: "Same launch as the blog post, written for X. Product checked the claims this morning.",
      preview: { kind: "post", channel: "X", mark: <BrandMark name="x" size={16} />, account: "@acme", text: POST, limit: 280 },
      fields: [{ key: "text", label: "Post", multiline: true, value: POST, validate: (v) => (v.length > 280 ? "Posts on X stop at 280 characters" : null) }],
    },
    {
      id: "r-vendor",
      requester: HANNAH,
      title: "Pay Brightline Studio $4,800.00",
      context: "Invoice BL-2026-10 · design retainer",
      priority: "medium",
      status: "pending",
      requestedAt: now - 5 * HOUR,
      expiresAt: now + 3 * DAY,
      note: "Matches PO-1182 line for line, same as the last three months. Due Friday; transfers take two days.",
      preview: {
        kind: "payment",
        direction: "payment",
        amount: 4800,
        currency: "USD",
        counterparty: "Brightline Studio",
        method: "Operating account ending 2290",
        memo: "PO-1182 · October design retainer",
      },
    },
    {
      id: "r-config",
      requester: OPS,
      title: "Raise the webhook retry limit from 3 to 5",
      context: "config/webhooks.yaml · production",
      priority: "low",
      status: "pending",
      requestedAt: now - 6 * HOUR,
      note: "Customers with slow endpoints lost 212 events last week after the third retry. Five retries, up to 15 minutes apart, would have delivered all of them.",
      preview: {
        kind: "diff",
        name: "config/webhooks.yaml",
        before: "webhooks:\n  timeout_ms: 10000\n  retries: 3\n  backoff: exponential\n  max_backoff_s: 300",
        after: "webhooks:\n  timeout_ms: 10000\n  retries: 5\n  backoff: exponential\n  max_backoff_s: 900",
      },
      tool: { server: "config", name: "apply", arguments: { file: "config/webhooks.yaml", environment: "production" } },
    },
    {
      id: "r-close",
      requester: OLU,
      title: "Close Kestrel’s account and delete its data",
      context: "Account closure · asked for by the customer",
      status: "pending",
      requestedAt: now - 26 * HOUR,
      note: "Their admin asked in writing on Monday, and the final invoice is paid. Their export was sent on Tuesday.",
      preview: {
        kind: "delete",
        what: "the Kestrel workspace",
        items: ["214 projects and the 3.1 GB of files in them", "18 members’ access; their own accounts stay", "4 API keys and 2 webhooks"],
      },
    },
  ];

  const history: ApprovalRequest[] = [
    {
      id: "h-lunch",
      requester: THEO,
      title: "Reimburse $186.00 for the design team lunch",
      context: "Expense report EXP-2274",
      status: "approved",
      requestedAt: now - 26 * HOUR,
      preview: { kind: "payment", direction: "payment", amount: 186, currency: "USD", counterparty: "Theo Marchetti", memo: "Team lunch, Oct 30" },
      outcome: { by: "Ines Duarte", at: now - 25 * HOUR },
    },
    {
      id: "h-refund-halden",
      requester: SUPPORT,
      title: "Refund $90.00 to Halden & Co",
      context: "Ticket #8790 · unused seats",
      status: "approved",
      requestedAt: now - 3 * HOUR,
      preview: { kind: "payment", direction: "refund", amount: 45, currency: "USD", counterparty: "Halden & Co", method: "Visa ending 1208" },
      tool: { server: "payments", name: "refunds.create", arguments: { amount: 4500 } },
      outcome: { by: ME, at: now - 2 * HOUR, edited: true, note: "Half: they used the extra seats for two weeks." },
    },
    {
      id: "h-booth",
      requester: GRACE,
      title: "Book a second booth at Launch Week",
      context: "Events budget · $6,500",
      status: "declined",
      requestedAt: now - 5 * HOUR,
      outcome: { by: ME, at: now - 4 * HOUR - 50 * MIN, note: "Not this quarter. Let’s look at it again in January." },
    },
    {
      id: "h-restart",
      requester: OPS,
      title: "Restart the search cluster in production",
      context: "search-prod-2 · 3 nodes",
      priority: "high",
      status: "declined",
      requestedAt: now - 30 * HOUR,
      tool: { server: "cluster", name: "restart", arguments: { name: "search-prod-2" } },
      outcome: { by: "Ada Okafor", at: now - 29 * HOUR, note: "Not during the launch. After 6 PM is fine." },
    },
    {
      id: "h-trial",
      requester: OLU,
      title: "Extend Asante Labs’ trial by 14 days",
      context: "Trial · Asante Labs",
      status: "expired",
      requestedAt: now - 9 * HOUR,
      expiresAt: now - 2 * HOUR,
      preview: {
        kind: "details",
        rows: [
          { label: "Workspace", value: "Asante Labs" },
          { label: "Trial ends", from: "Today", value: "In 14 days" },
        ],
      },
    },
  ];

  if (view === "empty") return history;
  return [...pending, ...history];
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// The fake data is built from the browser's clock, so the demo renders in the browser only.
const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function ApprovalsInboxPreview() {
  const mounted = useMounted();
  if (!mounted) return <div className={styles.placeholder} />;
  return <Demo />;
}

function Demo() {
  const [view, setView] = useState<View>("admin");
  const [requests, setRequests] = useState<ApprovalRequest[]>(() => seed(Date.now(), "admin"));
  const [loading, setLoading] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [run, setRun] = useState(0);
  const failRef = useRef(failNext);
  // The vendor payment fails the first time it's approved, to show what a failure looks like.
  const paymentFailed = useRef(false);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  function show(next: View) {
    setView(next);
    setRequests(seed(Date.now(), next));
    setLoading(next === "loading");
    paymentFailed.current = false;
    setRun((n) => n + 1);
  }

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 2400);
    return () => window.clearTimeout(t);
  }, [loading]);

  return (
    <div className={base.stack}>
      <div className={styles.controls}>
        <Select aria-label="Preview state" value={view} onValueChange={(v) => show(v as View)} options={VIEWS} />
        <Switch label="Fail the next decision" checked={failNext} onCheckedChange={setFailNext} />
      </div>

      <ApprovalsInbox
        key={run}
        requests={view === "error" ? [] : requests}
        canDecide={view !== "viewer"}
        permissionNote="Only owners and admins can approve. Ask Ines Duarte or Ada Okafor."
        loading={loading}
        error={view === "error" ? "Acme didn’t answer in time. Nothing was approved or declined." : null}
        onRetry={() => show("loading")}
        onDecide={async (decision) => {
          await wait(700 + Math.random() * 600);
          if (decision.id === "r-vendor" && decision.decision === "approve" && !paymentFailed.current) {
            paymentFailed.current = true;
            throw new Error("The bank didn’t confirm the transfer in time, so nothing was paid. Approve again to retry.");
          }
          if (failRef.current) {
            setFailNext(false);
            throw new Error(
              decision.decision === "approve"
                ? "Acme couldn’t save your approval, so nothing has changed."
                : "Acme couldn’t save your decline. The request is still waiting.",
            );
          }
          setRequests((list) =>
            list.map((r) =>
              r.id === decision.id
                ? {
                    ...r,
                    status: decision.decision === "approve" ? "approved" : "declined",
                    outcome: { by: ME, at: Date.now(), note: decision.note, edited: !!decision.edits },
                  }
                : r,
            ),
          );
        }}
        onRequeue={async (id) => {
          await wait(500);
          const now = Date.now();
          setRequests((list) => list.map((r) => (r.id === id ? { ...r, status: "pending", requestedAt: now, expiresAt: now + 2 * HOUR, outcome: undefined } : r)));
        }}
      />

      <p className={base.note}>
        Approve with <kbd>A</kbd>, decline with <kbd>D</kbd>, move with <kbd>J</kbd> and <kbd>K</kbd>. Decisions wait six seconds for Undo before
        they’re sent. The Brightline Studio payment fails the first time you approve it.
      </p>
      <Toaster />
    </div>
  );
}
