"use client";

import { Progress, ProgressSteps } from "@registry/progress/progress";
import styles from "./showcase.module.css";
import { useCycle } from "./use-cycle";

/** Invitations go out a few at a time; the fill glides and the percentage rolls. */
const SENT = [18, 23, 29, 34, 41, 48];

export default function Showcase() {
  const step = useCycle(SENT.length, 1600);
  return (
    <div className={styles.stack}>
      <Progress label="Sending invitations" value={SENT[step]} max={48} />
      <Progress label="Importing guests" value={null} />
      <ProgressSteps label="Plan the supper" steps={["Guests", "Menu", "Seating", "Invites"]} current={Math.min(1 + Math.floor(step / 2), 3)} />
    </div>
  );
}
