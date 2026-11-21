"use client";

import { useState } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { SortableItem, SortableList } from "@registry/sortable-list/sortable-list";
import base from "./preview.module.css";
import styles from "./sortable-list.module.css";

type Course = { id: string; title: string; note: string; cook: string };

const COURSES: Course[] = [
  { id: "oysters", title: "Oysters with mignonette", note: "Two each, shucked at the table", cook: "Theo Okafor" },
  { id: "burrata", title: "Burrata with charred peaches", note: "Basil oil, flaky salt", cook: "Priya Natarajan" },
  { id: "risotto", title: "Saffron risotto", note: "Needs the last 20 minutes on the stove", cook: "Maya Chen" },
  { id: "ribs", title: "Braised short ribs, polenta, gremolata", note: "Braised the day before; reheats in the low oven while the risotto rests", cook: "Theo Okafor" },
  { id: "cake", title: "Olive oil cake", note: "Crème fraîche, roasted plums", cook: "Maya Chen" },
];

const PREP = [
  "Brine the short ribs",
  "Make the stock",
  "Bake the olive oil cake",
  "Roast the plums",
  "Shuck the oysters",
  "Chop the gremolata",
  "Toast the saffron",
  "Whip the crème fraîche",
  "Polish the glasses",
  "Set the table for eight",
  "Chill the white wine",
  "Light the candles",
].map((title, i) => ({ id: `prep-${i}`, title }));

const TOASTS = [
  { id: "maya", title: "Maya welcomes everyone", note: "The host opens; this one stays put", fixed: true },
  { id: "priya", title: "Priya, on the peaches", note: "Two minutes, she promised" },
  { id: "theo", title: "Theo, on ten years of Fridays", note: "Bring tissues" },
];

function move<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SortableListPreview() {
  const [courses, setCourses] = useState(COURSES);
  const [prep, setPrep] = useState(PREP);
  const [toasts, setToasts] = useState(TOASTS);
  const [last, setLast] = useState("");

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading} id="courses-heading">
          Friday supper
        </h2>
        <SortableList
          aria-labelledby="courses-heading"
          items={courses}
          onReorder={(from, to) => {
            setCourses((c) => move(c, from, to));
            setLast(`${courses[from].title} is now course ${to + 1}.`);
          }}
          renderItem={(c) => (
            <SortableItem
              leading={<Avatar name={c.cook} size={40} decorative />}
              title={c.title}
              description={c.note}
              trailing={c.cook.split(" ")[0]}
            />
          )}
        />
        <p className={base.note}>{last || "Drag a handle, or focus one and press Space."}</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label} id="prep-heading">
          The whole row, in a scroll box
        </h2>
        <ScrollArea className={styles.scroll} label="Prep list">
          <SortableList
            aria-labelledby="prep-heading"
            variant="plain"
            handle={false}
            className={styles.inner}
            items={prep}
            onReorder={(from, to) => setPrep((p) => move(p, from, to))}
            renderItem={(p) => <SortableItem title={p.title} />}
          />
        </ScrollArea>
      </section>

      <section className={base.group}>
        <h2 className={base.label} id="toasts-heading">
          A row that can’t be picked up
        </h2>
        <SortableList aria-labelledby="toasts-heading" onReorder={(from, to) => setToasts((t) => move(t, from, to))}>
          {toasts.map((t) => (
            <SortableItem key={t.id} title={t.title} description={t.note} disabled={t.fixed} />
          ))}
        </SortableList>
      </section>
    </div>
  );
}
