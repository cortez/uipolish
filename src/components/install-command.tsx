"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { TextMorph } from "@registry/text-morph/text-morph";
import styles from "./install-command.module.css";
import { copyText } from "@registry/text/copy-text";

/** A copyable line in a box: a setup command, or instructions for an agent.
 *  `leading` sits at the box's start, such as a compact select that picks
 *  which command is shown. `ready` false turns a copy into `onNotReady`, for
 *  a command still missing something the reader has to fill in. */
export function InstallCommand({
  command,
  label = "Setup command",
  leading,
  ready = true,
  onNotReady,
}: {
  command: string;
  label?: string;
  leading?: ReactNode;
  ready?: boolean;
  onNotReady?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const code = useRef<HTMLElement>(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (!ready) {
      onNotReady?.();
      return;
    }
    try {
      if (!(await copyText(command))) throw new Error("Couldn’t copy");
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: select the command so it can be copied by hand.
      if (code.current) getSelection()?.selectAllChildren(code.current);
    }
  }

  return (
    <div className={styles.command}>
      {leading && <div className={styles.leading}>{leading}</div>}
      <ScrollArea orientation="horizontal" className={styles.code} aria-label={label}>
        {/* A wrapped command breaks after a slash, never inside a word. */}
        <code ref={code}>
          {command.split(/(?<=\/)/).map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <wbr />}
              {part}
            </Fragment>
          ))}
        </code>
      </ScrollArea>
      <Button variant="ghost" size="sm" className={styles.copy} onClick={copy} aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}>
        <Icon name={copied ? "check" : "copy"} />
        <TextMorph className={styles.copyLabel}>{copied ? "Copied" : "Copy"}</TextMorph>
      </Button>
      <span role="status" className={styles.srOnly}>
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
