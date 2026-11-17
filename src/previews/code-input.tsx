"use client";

import { useEffect, useRef, useState } from "react";
import { CodeInput, type CodeInputStatus } from "@registry/code-input/code-input";
import { Button } from "@registry/button/button";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./code-input.module.css";
import base from "./preview.module.css";

const CODE = "123456";
const WRONG = "123465";

export function CodeInputPreview() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<CodeInputStatus>("idle");
  const [retry, setRetry] = useState<"select" | "clear">("select");
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => stop, []);

  function later(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  // Stands in for the server: about a second to check, then a yes or a no.
  function verify(value: string) {
    stop();
    setStatus("verifying");
    later(1100, () => setStatus(value === CODE ? "success" : "error"));
  }

  function reset() {
    stop();
    setCode("");
    setStatus("idle");
  }

  // Types a code in, one digit at a time, as a person would.
  function play(value: string) {
    reset();
    [...value].forEach((_, i) =>
      later(260 + i * 140, () => {
        setCode(value.slice(0, i + 1));
        if (i === value.length - 1) verify(value);
      }),
    );
  }

  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <div className={styles.intro}>
          <h2 className={base.heading}>Confirm your seat</h2>
          <p className={base.note}>
            Acme sent a 6-digit code to dana.whitfield@example.com to hold your place at Saturday’s supper. {CODE}{" "}
            works; any other code doesn’t.
          </p>
        </div>
        <CodeInput
          label="Confirmation code"
          name="code"
          value={code}
          status={status}
          retry={retry}
          labels={{ error: "That code didn’t match. Try again." }}
          onValueChange={(v) => {
            setCode(v);
            // The first character typed after a wrong code clears the complaint.
            if (status === "error" && v.length) setStatus("idle");
          }}
          onComplete={verify}
          hint={status === "success" ? "Seat held. See you Saturday at 7." : "The code expires in 10 minutes."}
        />
        <div className={base.row}>
          {status === "success" ? (
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
          ) : (
            <Button variant="ghost" className={styles.textAligned} onClick={reset} disabled={status === "verifying"}>
              Send a new code
            </Button>
          )}
        </div>
      </form>

      <section className={base.group}>
        <h2 className={base.label}>Replay the flow</h2>
        <div className={base.row}>
          <Button variant="secondary" onClick={() => play(CODE)}>
            A code that works
          </Button>
          <Button variant="secondary" onClick={() => play(WRONG)}>
            One that doesn’t
          </Button>
          <SegmentedControl
            size="sm"
            widths="content"
            aria-label="After a wrong code"
            value={retry}
            onValueChange={(v) => setRetry(v as "select" | "clear")}
          >
            <Segment value="select">Keep digits</Segment>
            <Segment value="clear">Clear digits</Segment>
          </SegmentedControl>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Other lengths, grouped, disabled</h2>
        <CodeInput label="Gate code" length={4} defaultValue="38" hint="The 4 digits on the keypad by the side gate." />
        <CodeInput label="Lockbox code" length={5} hint="On the box by the front door." />
        <CodeInput label="Authenticator code" group={3} hint="From your authenticator app." />
        <CodeInput label="Recovery code" length={8} group={4} characters="alphanumeric" hint="Letters and digits, in two groups of 4." />
        <CodeInput label="Backup code" defaultValue="190274" disabled />
      </section>
    </div>
  );
}
