"use client";

import { Citation, SourceList, Sources, type Source } from "@registry/sources/sources";
import styles from "./showcase.module.css";

const SOURCES: Source[] = [
  {
    title: "Storing leftovers safely",
    url: "https://health.example.org/food-safety/leftovers",
    excerpt: "Refrigerate leftovers within two hours of cooking.",
  },
  {
    title: "How long to rest a lamb shoulder",
    url: "https://kitchen.example.com/lamb/resting",
    excerpt: "Rest a slow-roasted shoulder for 30 minutes before carving.",
  },
];

export default function Showcase() {
  return (
    <Sources sources={SOURCES}>
      <div className={styles.stack}>
        <p>
          Rest the lamb for 30 minutes
          <Citation n={2} />, and get leftovers in the fridge within two hours
          <Citation n={1} />.
        </p>
        <SourceList />
      </div>
    </Sources>
  );
}
