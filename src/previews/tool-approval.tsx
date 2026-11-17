"use client";

import { useRef, useState } from "react";
import {
  ToolApproval,
  type ToolApprovalScope,
  type ToolApprovalStatus,
  type ToolDecision,
  type ToolRequest,
} from "@registry/tool-approval/tool-approval";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./tool-approval.module.css";

const SEND: ToolRequest = {
  id: "send",
  title: "Send a message to 12 guests",
  server: "postbox",
  tool: "send_message",
  effect: "send",
  summary: "To everyone booked for Saturday supper: “We’re starting at 7:30 instead of 7. Same table, 14 Alder Lane.”",
  arguments: {
    to: "booking:saturday-supper",
    recipients: 12,
    from: "mara@saturdaysupper.example.com",
    subject: "Saturday supper starts at 7:30",
    body: "Hi all, we’re starting at 7:30 instead of 7. Same table, 14 Alder Lane. Reply here if that doesn’t work. Mara",
  },
};

const REFUND: ToolRequest = {
  id: "refund",
  title: "Refund Ben Ito $48.00",
  server: "ledger",
  tool: "create_refund",
  effect: "spend",
  summary: "Ben cancelled 3 days ahead. The policy gives a full refund for his 2 seats.",
  consequence: "Goes back to Ben’s card. A refund can’t be reversed.",
  arguments: { booking: "BK-2207", guest: "Ben Ito", amount: 48.0, currency: "USD", reason: "cancelled_72h" },
};

const LIST: ToolRequest = {
  id: "list",
  title: "Add 4 items to the shopping list",
  server: "acme",
  tool: "update_list",
  effect: "change",
  summary: "Lamb shoulder 2.8 kg, white beans, sourdough and lemons. The total goes from $212.00 to $236.00.",
  arguments: {
    list: 212,
    add: [
      { item: "Lamb shoulder", quantity: 2.8, unit: "kg" },
      { item: "White beans", quantity: 5, unit: "jar" },
      { item: "Sourdough", quantity: 3, unit: "loaf" },
      { item: "Lemons", quantity: 6 },
    ],
  },
};

const READ: ToolRequest = {
  id: "read",
  title: "Read Saturday’s bookings",
  server: "acme",
  tool: "get_bookings",
  effect: "read",
  summary: "Names, seats and dietary notes for 12 guests.",
  arguments: { event: "saturday-supper", fields: ["name", "seats", "dietary"] },
};

const DELETE: ToolRequest = {
  id: "delete",
  title: "Delete the draft menu “Autumn v2”",
  server: "acme",
  tool: "delete_menu",
  effect: "delete",
  summary: "An older draft nobody has seen. The menu you shared with guests stays.",
  arguments: { menu: "autumn-v2", status: "draft" },
};

type Item = {
  request: ToolRequest;
  status: ToolApprovalStatus;
  scope?: ToolApprovalScope;
  reason?: string;
};

const START: Item[] = [SEND, REFUND, LIST].map((request) => ({ request, status: "waiting" }));

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function ToolApprovalPreview() {
  const [items, setItems] = useState(START);
  const [run, setRun] = useState(0);
  const refundFailed = useRef(false);

  function settle(d: ToolDecision) {
    setItems((all) =>
      all.map((item) =>
        item.request.id === d.id
          ? { ...item, status: d.decision === "allow" ? "allowed" : "denied", scope: d.scope, reason: d.reason }
          : item,
      ),
    );
  }

  // Ledger answers after a moment, and the first refund fails, so the busy
  // button and the error can be seen.
  function decide(d: ToolDecision) {
    if (d.id !== "refund") return settle(d);
    return wait(900).then(() => {
      if (d.decision === "allow" && !refundFailed.current) {
        refundFailed.current = true;
        throw new Error("Ledger timed out");
      }
      settle(d);
    });
  }

  function expire() {
    setItems((all) => {
      const i = all.findIndex((item) => item.status === "waiting");
      return i === -1 ? all : all.map((item, k) => (k === i ? { ...item, status: "expired" } : item));
    });
  }

  function again() {
    refundFailed.current = false;
    setItems(START);
    setRun((r) => r + 1);
  }

  const waiting = items.filter((item) => item.status === "waiting");
  const first = waiting[0];

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Copper moving Saturday supper to 7:30</h2>
          <div className={own.controls}>
            <Button variant="secondary" onClick={expire} disabled={!first}>
              Let it expire
            </Button>
            <Button variant="secondary" onClick={again}>
              Start over
            </Button>
          </div>
        </div>
        <div key={run} className={own.thread}>
          <p className={own.prompt}>Move Saturday to 7:30, tell everyone, and sort out Ben’s refund.</p>
          <p className={own.reply}>I’ve updated the booking. Three things need your OK before I go on.</p>
          {items.map((item) =>
            item.status !== "waiting" || item === first ? (
              <ToolApproval
                key={item.request.id}
                agent="Copper"
                request={item.request}
                status={item.status}
                scope={item.scope}
                reason={item.reason}
                waited="5 minutes"
                queue={item === first ? waiting.slice(1).map((w) => w.request) : undefined}
                onDecide={decide}
              />
            ) : null,
          )}
          <p className={own.reply}>
            {first ? "Waiting for you." : "That’s everything. I’ll check replies from guests in an hour."}
          </p>
        </div>
        <p className={styles.note}>
          Ledger takes a moment to answer and the first refund fails on purpose, so you can see the busy button and
          the error.
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Reads and deletes</h2>
        <div className={own.thread}>
          <Single request={READ} />
          <Single request={DELETE} />
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Settled, from earlier in the conversation</h2>
        <div className={own.thread}>
          <ToolApproval agent="Copper" request={LIST} status="allowed" scope="conversation" onDecide={() => {}} />
          <ToolApproval agent="Copper" request={SEND} status="denied" reason="not yet, I’m still checking with Ben" onDecide={() => {}} />
          <ToolApproval agent="Copper" request={REFUND} status="expired" waited="5 minutes" onDecide={() => {}} />
        </div>
      </section>
    </div>
  );
}

function Single({ request }: { request: ToolRequest }) {
  const [item, setItem] = useState<Item>({ request, status: "waiting" });
  return (
    <ToolApproval
      agent="Copper"
      request={request}
      status={item.status}
      scope={item.scope}
      reason={item.reason}
      onDecide={(d) =>
        setItem({ request, status: d.decision === "allow" ? "allowed" : "denied", scope: d.scope, reason: d.reason })
      }
    />
  );
}
