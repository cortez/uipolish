"use client";

import { useState } from "react";
import { AnimatedSize } from "@registry/animated-size/animated-size";
import { Badge } from "@registry/badge/badge";
import { Button } from "@registry/button/button";
import { List, ListItem } from "@registry/list/list";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import base from "./preview.module.css";

const MENU: Record<string, string[]> = {
  starter: ["Charred leeks, hazelnut"],
  main: ["Braised short rib", "Wild mushroom risotto", "Halibut, brown butter"],
  dessert: ["Pear tarte tatin", "Dark chocolate pot"],
};

const STATUSES = [
  { label: "Draft", tone: "neutral" },
  { label: "Sent to 12 guests", tone: "accent" },
  { label: "Confirmed", tone: "positive" },
] as const;

export function AnimatedSizePreview() {
  const [course, setCourse] = useState("main");
  const [status, setStatus] = useState(0);
  const current = STATUSES[status];

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Height follows the content</h2>
        <SegmentedControl aria-label="Course" value={course} onValueChange={setCourse}>
          <Segment value="starter">Starter</Segment>
          <Segment value="main">Main</Segment>
          <Segment value="dessert">Dessert</Segment>
        </SegmentedControl>
        <AnimatedSize>
          <List aria-label="Dishes">
            {MENU[course].map((dish) => (
              <ListItem key={dish} title={dish} />
            ))}
          </List>
        </AnimatedSize>
        <p className={base.note}>This line rides along with the list instead of jumping.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Width follows a label</h2>
        <div className={base.row}>
          <AnimatedSize axis="width">
            <Badge tone={current.tone} dot>
              {current.label}
            </Badge>
          </AnimatedSize>
          <Button variant="secondary" onClick={() => setStatus((s) => (s + 1) % STATUSES.length)}>
            Next status
          </Button>
        </div>
      </section>
    </div>
  );
}
