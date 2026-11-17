"use client";

import { Badge } from "@registry/badge/badge";
import styles from "./showcase.module.css";
import { useCycle } from "./use-cycle";

/** Replies arrive and are read: the count rolls its digits. */
const UNREAD = [3, 4, 5, 9, 10, 2];

export default function Showcase() {
  const unread = UNREAD[useCycle(UNREAD.length, 1800)];
  return (
    <div className={styles.row}>
      <Badge tone="positive" dot>Going</Badge>
      <Badge tone="warning" dot>Waitlist</Badge>
      <Badge tone="danger" dot>Card declined</Badge>
      <Badge>Plus one</Badge>
      <Badge size="sm" tone="accent" count={unread} label={`${unread} unread replies`} />
    </div>
  );
}
