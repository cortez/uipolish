"use client";

import { Progress, ProgressSteps } from "@registry/progress/progress";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <Progress label="Sending invitations" value={18} max={48} />
      <Progress label="Importing guests" value={null} />
      <ProgressSteps label="Plan the supper" steps={["Guests", "Menu", "Seating", "Invites"]} current={1} />
    </div>
  );
}
