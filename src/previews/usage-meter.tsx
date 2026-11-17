"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { PromptInput } from "@registry/prompt-input/prompt-input";
import {
  UsageBreakdown,
  UsageMeter,
  type UsageCompaction,
  type UsageSegment,
} from "@registry/usage-meter/usage-meter";
import base from "./preview.module.css";
import styles from "./usage-meter.module.css";

const LIMIT = 200_000;
const START = { system: 12_400, files: 18_200, conversation: 93_600 };
/** What a reply adds, spread over its chunks. */
const REPLY = 28_000;
const SUMMARY = 7_400;
const BUDGET = 10;

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

export function UsageMeterPreview() {
  const [usage, setUsage] = useState(START);
  const [streaming, setStreaming] = useState(false);
  const [compaction, setCompaction] = useState<UsageCompaction | undefined>();
  const failedOnce = useRef(false);
  const stream = useTimers();
  const work = useTimers();

  const [spent, setSpent] = useState({ planning: 1.85, shopping: 0.95, messages: 0.6 });

  const used = usage.system + usage.files + usage.conversation;
  const usedRef = useRef(used);
  useEffect(() => {
    usedRef.current = used;
  }, [used]);
  const segments: UsageSegment[] = [
    { id: "system", label: "System & tools", value: usage.system },
    { id: "files", label: "Files", value: usage.files },
    { id: "conversation", label: "Conversation", value: usage.conversation },
  ];

  // A reply arrives in chunks: the figures climb without anything moving around them.
  function reply() {
    stream.clear();
    setStreaming(true);
    const chunks = 20;
    for (let i = 1; i <= chunks; i++) {
      stream.later(() => {
        setUsage((u) => {
          const room = LIMIT - (u.system + u.files + u.conversation);
          return { ...u, conversation: u.conversation + Math.max(0, Math.min(REPLY / chunks, room)) };
        });
        if (i === chunks) setStreaming(false);
      }, i * 110);
    }
  }

  function stop() {
    stream.clear();
    setStreaming(false);
  }

  // The first compaction fails on purpose, so the error and retry can be seen.
  function compact() {
    stop();
    setCompaction({ status: "running" });
    work.later(() => {
      if (!failedOnce.current) {
        failedOnce.current = true;
        setCompaction({ status: "failed", error: "Copper couldn’t write the summary. Nothing was lost; try again." });
        return;
      }
      // The conversation becomes a short summary; the system prompt and files stay.
      setUsage((u) => ({ ...u, conversation: SUMMARY }));
      setCompaction({ status: "done", before: usedRef.current, after: START.system + START.files + SUMMARY });
    }, 1600);
  }

  function reset() {
    stream.clear();
    work.clear();
    failedOnce.current = false;
    setStreaming(false);
    setCompaction(undefined);
    setUsage(START);
  }

  function jump(fraction: number) {
    stop();
    setCompaction(undefined);
    setUsage({ ...START, conversation: Math.round(LIMIT * fraction) - START.system - START.files });
  }

  const meter = {
    used,
    limit: LIMIT,
    segments,
    agent: "Copper",
    onCompact: compact,
    compaction,
  };

  const spentTotal = spent.planning + spent.shopping + spent.messages;

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Saturday supper with Copper</h2>
        <PromptInput
          placeholder="Ask Copper about the menu, the shopping, the timing…"
          attachments={false}
          streaming={streaming}
          onStop={stop}
          onSubmit={reply}
          footer={<UsageMeter {...meter} />}
        />
        <div className={base.row}>
          <Button onClick={reply} busy={streaming}>
            {streaming ? "Replying…" : "Stream a reply"}
          </Button>
          <Button variant="secondary" onClick={() => jump(0.8)}>
            Jump to 80%
          </Button>
          <Button variant="secondary" onClick={() => jump(0.97)}>
            Jump to 97%
          </Button>
          <Button variant="secondary" onClick={() => jump(1)}>
            Fill it
          </Button>
          <Button variant="secondary" onClick={reset} data-demo-controls="">
            Start over
          </Button>
        </div>
        <p className={base.note}>
          Each reply adds about 28k tokens. Open the meter to see the breakdown; from 75% it offers to compact. The
          first compaction fails on purpose, so you can see the error and retry.
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>The breakdown on its own, on a settings page</h2>
        <div className={styles.card}>
          <UsageBreakdown {...meter} announce={false} />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>A spending budget, with the bar</h2>
        <div className={styles.toolbar}>
          <UsageMeter
            kind="money"
            indicator="bar"
            label="Spending today"
            period="today"
            agent="Copper"
            used={spentTotal}
            limit={BUDGET}
            segments={[
              { id: "planning", label: "Menu planning", value: spent.planning },
              { id: "shopping", label: "Shopping list", value: spent.shopping },
              { id: "messages", label: "Messages to guests", value: spent.messages },
            ]}
          />
          <Button
            variant="secondary"
            onClick={() => setSpent((s) => ({ ...s, shopping: s.shopping + 1.6 }))}
            disabled={spentTotal >= BUDGET}
          >
            Spend $1.60
          </Button>
          <Button variant="ghost" onClick={() => setSpent({ planning: 1.85, shopping: 0.95, messages: 0.6 })}>
            Reset
          </Button>
        </div>
        <p className={base.note}>
          {spentTotal >= BUDGET ? "The budget is used up for today." : "Mara Okafor set $10.00 a day for Copper."}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Every tone at once</h2>
        <div className={styles.toolbar}>
          <UsageMeter used={0} limit={LIMIT} agent="Copper" />
          <UsageMeter used={62_000} limit={LIMIT} agent="Copper" />
          <UsageMeter used={164_000} limit={LIMIT} agent="Copper" />
          <UsageMeter used={194_000} limit={LIMIT} agent="Copper" />
          <UsageMeter used={LIMIT} limit={LIMIT} agent="Copper" indicator="bar" />
        </div>
      </section>
    </div>
  );
}
