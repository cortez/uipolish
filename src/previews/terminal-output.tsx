"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { TerminalOutput, type TerminalLine, type TerminalStatus } from "@registry/terminal-output/terminal-output";
import styles from "./terminal-output.module.css";
import base from "./preview.module.css";

const TEST_RUN = `> supper-club@0.9.2 test
> vitest run

 RUN  v3.2.4 /Users/maya/code/supper-club

 ✓ src/lib/split-bill.test.ts (14 tests) 38ms
 ✓ src/lib/dinner-total.test.ts (9 tests) 21ms
 ✓ src/lib/guest-list.test.ts (11 tests) 17ms
 ✓ src/lib/dietary-tags.test.ts (6 tests) 9ms
 ✓ src/components/invite-button.test.tsx (5 tests) 112ms
 ✓ src/components/menu-card.test.tsx (8 tests) 146ms
 ✓ src/api/invitations.test.ts (12 tests) 204ms

 Test Files  7 passed (7)
      Tests  65 passed (65)
   Start at  19:42:07
   Duration  2.41s (transform 310ms, setup 0ms, collect 1.12s, tests 547ms, environment 402ms, prepare 88ms)`;

const LINT_RUN = `> supper-club@0.9.2 lint
> eslint .

✔ No problems found in 48 files.`;

const FAILED: TerminalLine[] = [
  { text: "> supper-club@0.9.2 test" },
  { text: "> vitest run src/lib/split-bill.test.ts" },
  { text: "" },
  { text: " RUN  v3.2.4 /Users/maya/code/supper-club" },
  { text: "" },
  { text: " ❯ src/lib/split-bill.test.ts (14 tests | 1 failed) 41ms" },
  { text: "   ✓ splits evenly between four guests" },
  { text: "   ✓ leaves the host out when they cover the wine" },
  { text: "   × rounds a three-way split so the cents add up" },
  { text: "" },
  { text: " FAIL  src/lib/split-bill.test.ts > rounds a three-way split so the cents add up", stderr: true },
  { text: "AssertionError: expected [ 33.33, 33.33, 33.33 ] to deeply equal [ 33.34, 33.33, 33.33 ]", stderr: true },
  { text: "", stderr: true },
  { text: "- Expected", stderr: true },
  { text: "+ Received", stderr: true },
  { text: "", stderr: true },
  { text: "  [", stderr: true },
  { text: "-   33.34,", stderr: true },
  { text: "+   33.33,", stderr: true },
  { text: "    33.33,", stderr: true },
  { text: "    33.33,", stderr: true },
  { text: "  ]", stderr: true },
  { text: "", stderr: true },
  { text: " ❯ src/lib/split-bill.test.ts:58:42", stderr: true },
  { text: "     56|   it(\"rounds a three-way split so the cents add up\", () => {", stderr: true },
  { text: "     57|     const shares = splitBill({ total: 100, guests: [\"maya\", \"dana\", \"theo\"] });", stderr: true },
  { text: "     58|     expect(shares.map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);", stderr: true },
  { text: "       |                                          ^", stderr: true },
  { text: "" },
  { text: " Test Files  1 failed (1)" },
  { text: "      Tests  1 failed | 13 passed (14)" },
  { text: "   Duration  1.08s" },
];

/** Prints the test run a line at a time, the way vitest's output arrives. */
function useRun(text: string) {
  const [count, setCount] = useState(0);
  const [run, setRun] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [times, setTimes] = useState<{ start?: number; end?: number }>({});
  const timer = useRef(0);
  const lines = text.split("\n");

  useEffect(() => {
    let at = 0;
    function tick() {
      at += 1;
      setCount(at);
      if (at < lines.length) timer.current = window.setTimeout(tick, 120 + Math.random() * 380);
      else setTimes((t) => ({ ...t, end: Date.now() }));
    }
    timer.current = window.setTimeout(() => {
      setTimes({ start: Date.now() });
      // Nothing for a moment while the command starts.
      timer.current = window.setTimeout(tick, 900);
    }, 0);
    return () => clearTimeout(timer.current);
  }, [lines.length, run]);

  const status: TerminalStatus = stopped ? "stopped" : count < lines.length ? "running" : "done";

  return {
    output: count === 0 ? "" : `${lines.slice(0, count).join("\n")}\n`,
    status,
    startedAt: times.start,
    finishedAt: times.end,
    stop: () => {
      clearTimeout(timer.current);
      setTimes((t) => ({ ...t, end: Date.now() }));
      setStopped(true);
    },
    replay: () => {
      clearTimeout(timer.current);
      setCount(0);
      setStopped(false);
      setTimes({});
      setRun((r) => r + 1);
    },
  };
}

export function TerminalOutputPreview() {
  const run = useRun(TEST_RUN);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Streaming</h2>
          <Button variant="secondary" onClick={run.replay}>
            Replay
          </Button>
        </div>
        <p className={styles.prompt}>Running the tests for split-bill.ts before I open the pull request:</p>
        <TerminalOutput
          command="npm test"
          output={run.output}
          status={run.status}
          exitCode={run.status === "stopped" ? 130 : run.status === "done" ? 0 : undefined}
          startedAt={run.startedAt}
          finishedAt={run.finishedAt}
          onStop={run.stop}
        />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Finished, exit 0</h2>
        <TerminalOutput command="npm run lint" output={LINT_RUN} status="done" exitCode={0} startedAt={0} finishedAt={3120} />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Failed, with stderr, folded to the last 12 lines</h2>
        <TerminalOutput
          command="npm test -- src/lib/split-bill.test.ts"
          output={FAILED}
          status="failed"
          exitCode={1}
          startedAt={0}
          finishedAt={1640}
          collapseAfter={12}
        />
      </section>
    </div>
  );
}
