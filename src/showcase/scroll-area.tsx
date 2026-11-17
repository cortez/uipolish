"use client";

import { useState } from "react";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./showcase.module.css";

const FILTERS = ["All dinners", "Supper club", "Brunches", "Birthdays", "Potlucks", "Tastings", "Holidays"];

export default function Showcase() {
  const [filter, setFilter] = useState(FILTERS[0]);
  return (
    <div className={styles.stack}>
      <ScrollArea label="Event type" orientation="horizontal">
        <SegmentedControl size="sm" aria-label="Event type" widths="content" value={filter} onValueChange={setFilter}>
          {FILTERS.map((f) => (
            <Segment key={f} value={f}>
              {f}
            </Segment>
          ))}
        </SegmentedControl>
      </ScrollArea>
    </div>
  );
}
