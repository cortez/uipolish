"use client";

import { Badge } from "@registry/badge/badge";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.row}>
      <Badge tone="positive" dot>Going</Badge>
      <Badge tone="warning" dot>Waitlist</Badge>
      <Badge tone="danger" dot>Card declined</Badge>
      <Badge>Plus one</Badge>
      <Badge size="sm" tone="accent" count={3} label="3 unread replies" />
    </div>
  );
}
