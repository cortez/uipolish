"use client";

import { useState } from "react";
import { AnimatedSize } from "@registry/animated-size/animated-size";
import { List, ListItem } from "@registry/list/list";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./showcase.module.css";

const MENU: Record<string, string[]> = {
  starter: ["Charred leeks, hazelnut"],
  main: ["Braised short rib", "Wild mushroom risotto", "Halibut, brown butter"],
  dessert: ["Pear tarte tatin", "Dark chocolate pot"],
};

export default function Showcase() {
  const [course, setCourse] = useState("main");
  return (
    <div className={styles.stack}>
      <SegmentedControl aria-label="Course" value={course} onValueChange={setCourse}>
        <Segment value="starter">Starter</Segment>
        <Segment value="main">Main</Segment>
        <Segment value="dessert">Dessert</Segment>
      </SegmentedControl>
      {/* Room for the longest list (three rows at touch height), held from the
          start: the card centers its content, and without it the control
          would slide away from the pointer each time the list changed height. */}
      <div style={{ minHeight: 152 }}>
        <AnimatedSize>
          <List aria-label="Dishes">
            {MENU[course].map((dish) => (
              <ListItem key={dish} title={dish} />
            ))}
          </List>
        </AnimatedSize>
      </div>
    </div>
  );
}
