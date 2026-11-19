"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Progress, ProgressSteps } from "@registry/progress/progress";
import base from "./preview.module.css";
import styles from "./progress.module.css";

const TOTAL = 48;
const STEPS = ["Guest list", "Menu", "Seating", "Invitations"];

export function ProgressPreview() {
  const [sent, setSent] = useState(0);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(1);
  const timer = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  function send() {
    window.clearInterval(timer.current);
    // Counted here, not in the state updater: an updater runs twice in
    // strict mode, and the second pass would stop the timer a step early.
    let count = 0;
    setSent(0);
    setRunning(true);
    timer.current = window.setInterval(() => {
      count = Math.min(TOTAL, count + 1 + Math.floor(Math.random() * 4));
      setSent(count);
      if (count >= TOTAL) {
        window.clearInterval(timer.current);
        setRunning(false);
      }
    }, 280);
  }

  return (
    <div className={base.stack}>
      <section className={styles.panel}>
        <Progress
          label={sent >= TOTAL ? "48 invitations sent" : "Sending invitations"}
          value={sent}
          max={TOTAL}
        />
        <div className={base.row}>
          <Button variant="secondary" onClick={send} busy={running}>
            {sent >= TOTAL ? "Send again" : "Send invitations"}
          </Button>
        </div>
      </section>

      <section className={styles.panel}>
        <Progress label="Importing guests" value={null} valueText="contacts.example.com" />
        <Progress label="Upload stopped: menu-photos.zip" value={62} tone="danger" valueText="62% of 18 MB" />
      </section>

      <section className={styles.panel}>
        <ProgressSteps label="Plan the supper" steps={STEPS} current={step} />
        <div className={base.row}>
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          <Button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))} disabled={step === STEPS.length}>
            {step >= STEPS.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      </section>
    </div>
  );
}
