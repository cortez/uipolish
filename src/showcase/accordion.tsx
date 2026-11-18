"use client";

import { useState } from "react";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [open, setOpen] = useState<string | null>("bring");
  return (
    <div className={styles.stack}>
      <Accordion value={open} onValueChange={setOpen}>
        <AccordionItem value="bring" title="Should I bring anything?">
          <p>Just yourself. Wine is paired with each course.</p>
        </AccordionItem>
        <AccordionItem value="diet" title="Can the menu change for me?">
          <p>Yes. Note any allergies on your RSVP by Thursday.</p>
        </AccordionItem>
        <AccordionItem value="late" title="What if I’m running late?">
          <p>Dinner starts at 7:30. We hold the first course for 15 minutes.</p>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
