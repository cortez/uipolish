"use client";

import { useState } from "react";
import { Icon } from "@registry/icons/icons";
import { Tree, type TreeItem } from "@registry/tree/tree";
import styles from "./showcase.module.css";

const folder = <Icon name="folder" />;
const file = <Icon name="file" />;

const FILES: TreeItem[] = [
  {
    id: "menus",
    label: "Menus",
    icon: folder,
    meta: 2,
    metaLabel: "2 changes",
    children: [
      { id: "menus/friday-supper.md", label: "friday-supper.md", icon: file },
      { id: "menus/harvest-dinner.md", label: "harvest-dinner.md", icon: file },
    ],
  },
  {
    id: "guests",
    label: "Guests",
    icon: folder,
    children: [
      { id: "guests/rsvps.csv", label: "rsvps.csv", icon: file },
      { id: "guests/allergies.md", label: "allergies.md", icon: file },
    ],
  },
  { id: "invitation.md", label: "invitation.md", icon: file },
];

export default function Showcase() {
  const [selected, setSelected] = useState<string | null>("menus/friday-supper.md");
  return (
    <div className={styles.stack}>
      <Tree aria-label="Supper club files" items={FILES} value={selected} onValueChange={setSelected} defaultExpanded={["menus"]} />
    </div>
  );
}
