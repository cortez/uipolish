"use client";

import { Badge } from "@registry/badge/badge";
import { Icon } from "@registry/icons/icons";
import { Tooltip } from "@registry/tooltip/tooltip";
import styles from "./info-tip.module.css";

/** A docs page's tag: one chip with an info mark inside it, its note in a
 *  tooltip on the chip. Each is a button only so the note can be
 *  reached by keyboard. */
export function TitleTag({ kind, label, note }: { kind: "block" | "kit"; label: string; note: string }) {
  const mark = <Icon name="info" className={styles.mark} />;
  return (
    <Tooltip content={note}>
      <button type="button" className={styles.trigger}>
        <Badge size="sm" tone={kind === "block" ? "positive" : "accent"} className={styles.chip}>
          {label}
          {mark}
        </Badge>
      </button>
    </Tooltip>
  );
}
