"use client";

import { TerminalOutput } from "@registry/terminal-output/terminal-output";
import styles from "./showcase.module.css";

const OUTPUT = `> supper-club@0.9.2 test
> vitest run

 ✓ src/lib/split-bill.test.ts (14 tests) 38ms
 ✓ src/lib/dinner-total.test.ts (9 tests) 21ms

 Test Files  2 passed (2)`;

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <TerminalOutput command="npm test" output={OUTPUT} status="done" exitCode={0} startedAt={0} finishedAt={1240} />
    </div>
  );
}
