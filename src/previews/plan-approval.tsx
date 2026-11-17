"use client";

import { useEffect, useRef, useState } from "react";
import { PlanApproval, type PlanDecision, type PlanStep } from "@registry/plan-approval/plan-approval";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Switch } from "@registry/switch/switch";
import styles from "./preview.module.css";
import own from "./plan-approval.module.css";

const PLAN: PlanStep[] = [
  {
    id: "guests",
    title: "Check the guest list",
    status: "planned",
    icon: <Icon name="search" />,
    detail: "Read Saturday’s RSVPs and note dietary needs. 12 booked, 2 on the waitlist.",
    tool: "acme.list_rsvps",
  },
  {
    id: "menu",
    title: "Draft a four-course menu",
    status: "planned",
    icon: <Icon name="pencil" />,
    detail: "Built around the lamb shoulder, with a vegetarian main for the 3 guests who asked.",
    tool: "acme.draft_menu",
  },
  {
    id: "groceries",
    title: "Price the groceries at 3 shops",
    status: "planned",
    icon: <Icon name="file" />,
    detail: "Compare the shopping list at the market, the grocer and the butcher, and pick the cheapest in stock.",
    tool: "prices.search",
  },
  {
    id: "text",
    title: "Text the 12 guests",
    status: "planned",
    icon: <Icon name="send" />,
    detail: "“Supper is at 7:30 on Saturday, 14 Alder Lane. Reply with any allergies by Thursday.”",
    tool: "postbox.send_sms",
  },
  {
    id: "cleaner",
    title: "Book a cleaner for Sunday morning",
    status: "planned",
    icon: <Icon name="calendar" />,
    detail: "Two hours from 10am with Tidy & Co, $64. Holds the slot; you pay after.",
    tool: "tidy.book_slot",
  },
];

const TEXT_ERROR = "Postbox couldn’t reach 2 of 12 numbers. Check Mara’s and Theo’s numbers, then retry.";
const TIMES: Record<string, number> = { guests: 1100, menu: 1800, groceries: 1500, text: 1300, cleaner: 1200 };

export function PlanApprovalPreview() {
  const [steps, setSteps] = useState(PLAN);
  const [running, setRunning] = useState(false);
  const [failText, setFailText] = useState(true);
  const [round, setRound] = useState(0);
  const timers = useRef<number[]>([]);
  const failed = useRef(false);
  const live = useRef(steps);

  useEffect(() => {
    live.current = steps;
  }, [steps]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  function update(fn: (all: PlanStep[]) => PlanStep[]) {
    setSteps((all) => {
      const next = fn(all);
      live.current = next;
      return next;
    });
  }

  function set(id: string, change: Partial<PlanStep>) {
    update((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  }

  // Runs the next approved step, then the one after, until none are left.
  function runNext() {
    const step = live.current.find((s) => s.status === "approved");
    if (!step) {
      setRunning(false);
      return;
    }
    set(step.id, { status: "running", error: undefined });
    timers.current.push(
      window.setTimeout(() => {
        if (step.id === "text" && failText && !failed.current) {
          failed.current = true;
          set(step.id, { status: "failed", error: TEXT_ERROR });
          setRunning(false);
          return;
        }
        set(step.id, { status: "done" });
        timers.current.push(window.setTimeout(runNext, 240));
      }, TIMES[step.id] ?? 1200),
    );
  }

  function decide(id: string, decision: PlanDecision) {
    const was = live.current.find((s) => s.id === id)?.status;
    set(id, { status: decision === "approve" ? "approved" : "skipped" });
    // Skipping a failed step lets the rest of the plan carry on.
    if (was === "failed") {
      setRunning(true);
      timers.current.push(window.setTimeout(runNext, 240));
    }
  }

  function run() {
    // Steps nobody decided on don't run.
    update((all) => all.map((s) => (s.status === "planned" ? { ...s, status: "skipped" } : s)));
    setRunning(true);
    timers.current.push(window.setTimeout(runNext, 300));
  }

  function retry(id: string) {
    set(id, { status: "approved", error: undefined });
    setRunning(true);
    timers.current.push(window.setTimeout(runNext, 120));
  }

  function stop() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    update((all) => all.map((s) => (s.status === "running" ? { ...s, status: "approved" } : s)));
    setRunning(false);
  }

  function replay() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    failed.current = false;
    live.current = PLAN;
    setSteps(PLAN);
    setRunning(false);
    setRound((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Copper plans Saturday supper</h2>
          <div className={own.controls}>
            <Switch
              size="sm"
              label="Texting fails"
              checked={failText}
              onChange={(e) => setFailText(e.target.checked)}
            />
            <Button variant="secondary" onClick={replay}>
              <Icon name="retry" />
              Replay
            </Button>
          </div>
        </div>
        <PlanApproval
          key={round}
          className={own.card}
          title="Copper’s plan for Saturday"
          agent="Copper"
          steps={steps}
          running={running}
          onDecide={decide}
          onApproveAll={() => update((all) => all.map((s) => (s.status === "planned" ? { ...s, status: "approved" } : s)))}
          onRun={run}
          onStop={stop}
          onRetry={retry}
        />
        <p className={styles.note}>
          Arrow through the steps, Enter opens one, A approves and S skips.
        </p>
      </section>
    </div>
  );
}
