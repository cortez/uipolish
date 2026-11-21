"use client";

import { useState } from "react";
import { SortableItem, SortableList } from "@registry/sortable-list/sortable-list";
import styles from "./showcase.module.css";

const COURSES = [
  { id: "oysters", title: "Oysters with mignonette", note: "Theo" },
  { id: "burrata", title: "Burrata with peaches", note: "Priya" },
  { id: "risotto", title: "Saffron risotto", note: "Maya" },
  { id: "cake", title: "Olive oil cake", note: "Maya" },
];

export default function Showcase() {
  const [courses, setCourses] = useState(COURSES);

  return (
    <div className={styles.stack}>
      <SortableList
        aria-label="Courses"
        items={courses}
        onReorder={(from, to) =>
          setCourses((c) => {
            const next = c.slice();
            next.splice(to, 0, ...next.splice(from, 1));
            return next;
          })
        }
        renderItem={(c) => <SortableItem title={c.title} trailing={c.note} />}
      />
    </div>
  );
}
