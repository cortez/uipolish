"use client";

import { useState } from "react";
import { MergeStatus, type MergeState } from "@registry/merge-status/merge-status";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./merge-status.module.css";

/* One pull request walking through its states: its checks run one by one
   (or one fails), Merge turns green once they pass, and merging takes a
   moment, or is refused. The rows under it are each state at rest. */

const TOTAL = 5;

export function MergeStatusPreview() {
  const [state, setState] = useState<MergeState>("draft");
  const [passed, setPassed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [refuse, setRefuse] = useState(false);

  function runChecks(fail: boolean) {
    setState("checks-running");
    setPassed(0);
    setFailed(0);
    let n = 0;
    const tick = () => {
      n += 1;
      if (fail && n === 4) {
        setFailed(1);
        setState("checks-failed");
        return;
      }
      setPassed(n);
      if (n === TOTAL) setState("ready");
      else window.setTimeout(tick, 700);
    };
    window.setTimeout(tick, 700);
  }

  return (
    <div className={styles.stack}>
      <div className={styles.group}>
        <div className={own.pane}>
          <MergeStatus
            number={8376}
            href="https://github.com/acme/web/pull/8376"
            state={state}
            checks={{ passed, failed, total: TOTAL }}
            onMerge={() =>
              new Promise<void>((resolve, reject) =>
                window.setTimeout(() => {
                  if (refuse) {
                    setRefuse(false);
                    reject(new Error("Main moved on. Update the branch, then merge."));
                  } else {
                    setState("merged");
                    resolve();
                  }
                }, 1200),
              )
            }
            action={state === "draft" ? <Button variant="secondary" onClick={() => runChecks(false)}>Ready for review</Button> : undefined}
          />
        </div>
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => runChecks(false)}>
            Run checks
          </Button>
          <Button variant="secondary" onClick={() => runChecks(true)}>
            Run with a failure
          </Button>
          <Button variant="ghost" onClick={() => setRefuse(true)} disabled={state !== "ready" || refuse}>
            Refuse the next merge
          </Button>
          <Button variant="ghost" onClick={() => setState("draft")}>
            Reset
          </Button>
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>Every state</span>
        <div className={own.list}>
          <MergeStatus number={8371} state="draft" />
          <MergeStatus number={8372} state="checks-running" checks={{ passed: 2, total: 5 }} onMerge={() => {}} />
          <MergeStatus number={8373} state="checks-failed" checks={{ passed: 3, failed: 2, total: 5 }} onMerge={() => {}} />
          <MergeStatus number={8374} state="conflicts" onMerge={() => {}} />
          <MergeStatus number={8375} state="ready" onMerge={() => {}} />
          <MergeStatus number={8370} state="merged" />
        </div>
      </div>
    </div>
  );
}
