"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import styles from "./install-command.module.css";

const COPIED = "Paste into your agent";

/** One button that copies a prompt for a coding agent. The prompt itself
 *  stays out of sight; the label says what it is and whether it worked. */
export function CopyPrompt({ prompt, label, variant }: { prompt: string; label: string; variant?: "primary" | "secondary" }) {
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let next: typeof state = "copied";
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard blocked: the label says so in place. Get started, beside
      // this button, has the same setup.
      next = "blocked";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2400);
  }

  return (
    <Button variant={variant} onClick={copy}>
      <Icon name={state === "copied" ? "check" : "copy"} />
      {/* All three labels share one grid cell, so the widest sets the width
          and nothing beside the button moves. Only the current one shows; the
          swap is a short crossfade, not a letter morph: the strings share
          nothing, and twenty letters moving at once is too much for a click. */}
      <span className={styles.hold} aria-hidden="true">
        {(["idle", "copied", "blocked"] as const).map((s) => (
          <span key={s} className={styles.swap} data-shown={state === s || undefined}>
            {s === "copied" ? COPIED : s === "blocked" ? "Couldn’t copy" : label}
          </span>
        ))}
      </span>
      <span className={styles.srOnly}>{label}</span>
      <span role="status" className={styles.srOnly}>
        {state === "copied" ? "Copied. Paste it into your coding agent." : state === "blocked" ? "Couldn’t copy. Get started has the same setup." : ""}
      </span>
    </Button>
  );
}
