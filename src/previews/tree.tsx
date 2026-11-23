"use client";

import { useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { TextMorph } from "@registry/text-morph/text-morph";
import { Tree, type TreeItem } from "@registry/tree/tree";
import base from "./preview.module.css";
import styles from "./tree.module.css";

const folder = <Icon name="folder" />;
const file = <Icon name="file" />;
const added = <Icon name="diff-added" className={styles.added} />;
const modified = <Icon name="diff-modified" className={styles.modified} />;
const removed = <Icon name="diff-removed" className={styles.removed} />;

const FILES: TreeItem[] = [
  {
    id: "menus",
    label: "Menus",
    icon: folder,
    meta: 3,
    metaLabel: "3 changes",
    children: [
      {
        id: "menus/october",
        label: "October",
        icon: folder,
        meta: 2,
        metaLabel: "2 changes",
        children: [
          { id: "menus/october/friday-supper.md", label: "friday-supper.md", icon: file, meta: modified, metaLabel: "Modified" },
          { id: "menus/october/harvest-dinner.md", label: "harvest-dinner.md", icon: file, meta: added, metaLabel: "Added" },
          { id: "menus/october/wine-pairings.md", label: "wine-pairings.md", icon: file },
        ],
      },
      { id: "menus/september", label: "September", icon: folder, children: [{ id: "menus/september/garden-lunch.md", label: "garden-lunch.md", icon: file }] },
      { id: "menus/tasting-notes.md", label: "tasting-notes-from-the-cellar-visit-with-priya-and-theo.md", icon: file },
      { id: "menus/summer-bbq.md", label: "summer-bbq.md", icon: file, meta: removed, metaLabel: "Removed" },
    ],
  },
  {
    id: "guests",
    label: "Guests",
    icon: folder,
    children: [
      { id: "guests/rsvps.csv", label: "rsvps.csv", icon: file },
      { id: "guests/allergies.md", label: "allergies.md", icon: file },
      { id: "guests/seating.md", label: "seating.md", icon: file, disabled: true, meta: "Locked" },
    ],
  },
  { id: "receipts", label: "Receipts", icon: folder, children: [] },
  { id: "invitation.md", label: "invitation.md", icon: file },
  { id: "shopping-list.md", label: "shopping-list.md", icon: file },
];

const FOLDERS = ["menus", "menus/october", "menus/september", "guests", "receipts"];

const DRIVE: TreeItem[] = [
  { id: "photos", label: "Photos", icon: folder, lazy: true },
  { id: "suppliers", label: "Suppliers", icon: folder, lazy: true },
  { id: "archive", label: "Archive", icon: folder, lazy: true },
  { id: "house-rules.md", label: "house-rules.md", icon: file },
];

const DRIVE_FILES: Record<string, TreeItem[]> = {
  photos: [
    { id: "photos/2025", label: "2025", icon: folder, lazy: true },
    { id: "photos/long-table.jpg", label: "long-table.jpg", icon: file },
    { id: "photos/olive-oil-cake.jpg", label: "olive-oil-cake.jpg", icon: file },
  ],
  "photos/2025": [
    { id: "photos/2025/garden-lunch.jpg", label: "garden-lunch.jpg", icon: file },
    { id: "photos/2025/first-frost.jpg", label: "first-frost.jpg", icon: file },
  ],
  suppliers: [
    { id: "suppliers/bakery.md", label: "bakery.md", icon: file },
    { id: "suppliers/butcher.md", label: "butcher.md", icon: file },
  ],
  archive: [
    { id: "archive/2024-suppers.zip", label: "2024-suppers.zip", icon: file },
    { id: "archive/2023-suppers.zip", label: "2023-suppers.zip", icon: file },
  ],
};

const PLAN: TreeItem[] = [
  {
    id: "friday",
    label: "Friday supper",
    children: [
      { id: "friday/menu", label: "Menu", children: [{ id: "friday/menu/starters", label: "Starters" }, { id: "friday/menu/mains", label: "Mains" }, { id: "friday/menu/dessert", label: "Dessert" }] },
      { id: "friday/guests", label: "Guest list" },
      { id: "friday/run", label: "Run of show" },
    ],
  },
  { id: "harvest", label: "Harvest dinner", children: [{ id: "harvest/menu", label: "Menu" }, { id: "harvest/budget", label: "Budget" }] },
  { id: "ideas", label: "Ideas for winter" },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TreePreview() {
  const [selected, setSelected] = useState<string | null>("menus/october/friday-supper.md");
  const [expanded, setExpanded] = useState(["menus", "menus/october"]);
  const [page, setPage] = useState("friday/menu");
  const allOpen = FOLDERS.every((id) => expanded.includes(id));
  // The archive fails the first time it's asked for, so the retry row can be seen.
  const failed = useRef(false);

  async function loadChildren(item: TreeItem) {
    // Suppliers answers inside the 300ms wait: no loading row ever shows.
    await wait(item.id === "suppliers" ? 120 : 1200);
    if (item.id === "archive" && !failed.current) {
      failed.current = true;
      throw new Error("offline");
    }
    return DRIVE_FILES[item.id] ?? [];
  }

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Files, with one selected, change marks, a long name, an empty folder and a locked file</h2>
        <div className={styles.demo}>
          <div className={base.row}>
            {/* One toggle: it opens everything until everything is open,
                then it closes it all. The label morphs between the two. */}
            <Button variant="secondary" onClick={() => setExpanded(allOpen ? [] : FOLDERS)}>
              <Icon name={allOpen ? "chevron-up" : "chevron-down"} />
              <TextMorph>{allOpen ? "Collapse all" : "Expand all"}</TextMorph>
            </Button>
          </div>
          <div className={styles.frame}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle} id="tree-files">
                Supper club
              </h3>
              <ScrollArea className={styles.scroll}>
                <Tree
                  className={styles.tree}
                  aria-labelledby="tree-files"
                  items={FILES}
                  value={selected}
                  onValueChange={setSelected}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                />
              </ScrollArea>
            </div>
            <div className={styles.page}>
              <p className={styles.path}>{selected ?? "No file open"}</p>
              <p className={styles.detail}>
                Arrow keys move, Right and Left open and close a folder, Enter opens a file, and typing a name jumps to it. Press * to open every folder on a level.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Folders that load when opened: Photos takes a second, Suppliers answers at once, Archive fails the first time</h2>
        <div className={styles.card}>
          <Tree aria-label="Shared drive" items={DRIVE} loadChildren={loadChildren} />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Pages that hold pages: every row can be selected, and the chevron folds without selecting</h2>
        <div className={styles.card}>
          <Tree aria-label="Plans" items={PLAN} selectFolders value={page} onValueChange={setPage} defaultExpanded={["friday", "friday/menu"]} />
        </div>
      </section>
    </div>
  );
}
