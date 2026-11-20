"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { ContextMenu } from "@registry/context-menu/context-menu";
import {
  DropdownMenu,
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
} from "@registry/dropdown-menu/dropdown-menu";
import styles from "./preview.module.css";
import local from "./context-menu.module.css";

type Course = "Starter" | "Main" | "Dessert";

type Dish = {
  id: string;
  name: string;
  course: Course;
  note: string;
  pinned: boolean;
  tasted: boolean;
};

const START: Dish[] = [
  { id: "squash", name: "Roasted squash soup", course: "Starter", note: "Brown butter, sage", pinned: true, tasted: true },
  { id: "chicory", name: "Chicory and pear salad", course: "Starter", note: "Walnuts, blue cheese", pinned: false, tasted: true },
  { id: "short-rib", name: "Braised short rib", course: "Main", note: "Polenta, charred leeks", pinned: false, tasted: true },
  { id: "tart", name: "Apple tart", course: "Dessert", note: "Not tasted yet", pinned: false, tasted: false },
];

const COURSES: Course[] = ["Starter", "Main", "Dessert"];

// Items can live in components of your own; they find whichever menu they're in.
function RemoveItem({ onRemove }: { onRemove: () => void }) {
  return (
    <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={onRemove}>
      Remove dish
    </MenuItem>
  );
}

export function ContextMenuPreview() {
  const [dishes, setDishes] = useState(START);
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<{ dish: Dish; index: number } | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const copies = useRef(0);
  // The item that confirms in place: which dish's link was just copied, and
  // whether the clipboard took it.
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // The removed row is gone, and its menu with it; focus the Undo button instead of <body>.
  useEffect(() => {
    if (undo) undoRef.current?.focus();
  }, [undo]);

  function update(id: string, patch: Partial<Dish>) {
    setDishes((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function copyLink(dish: Dish) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(`https://example.com/menu/${dish.id}`);
      ok = true;
    } catch {
      // No clipboard access: say so in place rather than pretending.
    }
    setCopied({ id: dish.id, ok });
    setStatus(ok ? `Copied the link to ${dish.name}` : "Couldn’t copy the link. Your browser blocked the clipboard.");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 2000);
  }

  function duplicate(dish: Dish) {
    copies.current += 1;
    const copy: Dish = { ...dish, id: `${dish.id}-${copies.current}`, name: `${dish.name} (copy)`, pinned: false };
    setDishes((ds) => {
      const i = ds.findIndex((d) => d.id === dish.id);
      return [...ds.slice(0, i + 1), copy, ...ds.slice(i + 1)];
    });
    setStatus(`Duplicated ${dish.name}`);
  }

  function remove(dish: Dish) {
    const index = dishes.findIndex((d) => d.id === dish.id);
    setDishes((ds) => ds.filter((d) => d.id !== dish.id));
    setUndo({ dish, index });
    setStatus(`Removed ${dish.name}`);
  }

  function restore() {
    if (!undo) return;
    setDishes((ds) => [...ds.slice(0, undo.index), undo.dish, ...ds.slice(undo.index)]);
    setStatus(`Restored ${undo.dish.name}`);
    setUndo(null);
  }

  // One list of items for a dish. The row's "…" button and its right click
  // both render it, so the two can never drift apart.
  const actions = (dish: Dish) => (
    <>
      <MenuItem icon={<Icon name="duplicate" />} shortcut="⌘D" keyshortcuts="Meta+D" onSelect={() => duplicate(dish)}>
        Duplicate
      </MenuItem>
      <MenuItem
        icon={<Icon name={copied?.id === dish.id && copied.ok ? "check" : "link"} />}
        closeOnSelect={false}
        onSelect={() => copyLink(dish)}
      >
        {copied?.id === dish.id ? (copied.ok ? "Copied" : "Couldn’t copy") : "Copy link"}
      </MenuItem>
      <MenuSub label="Move to" icon={<Icon name="arrow-right" />}>
        <MenuRadioGroup value={dish.course} onValueChange={(course) => update(dish.id, { course: course as Course })}>
          {COURSES.map((course) => (
            <MenuRadioItem key={course} value={course}>
              {course}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuSub>
      <MenuItem
        icon={<Icon name="share" />}
        disabled={!dish.tasted}
        description={dish.tasted ? undefined : "Taste it with the chef first."}
        onSelect={() => setStatus(`Sent ${dish.name} to the host`)}
      >
        Send to the host
      </MenuItem>
      <MenuSeparator />
      <MenuCheckboxItem checked={dish.pinned} onCheckedChange={(pinned) => update(dish.id, { pinned })}>
        Pin to the top
      </MenuCheckboxItem>
      <MenuSeparator />
      <RemoveItem onRemove={() => remove(dish)} />
    </>
  );

  const sorted = [...dishes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Harvest dinner menu</h2>
        <p className={styles.note}>
          Right-click a dish, or press and hold it on a touch screen. From the keyboard, focus a row’s button and press
          Shift+F10 or the menu key. The “…” button opens the same items.
        </p>
        <ul className={local.contextList}>
          {sorted.length === 0 && <li className={local.contextEmpty}>No dishes left. Undo to bring one back.</li>}
          {sorted.map((dish) => (
            <ContextMenu
              key={dish.id}
              label={`Actions for ${dish.name}`}
              trigger={
                <li className={local.contextRow}>
                  <div className={local.contextMain}>
                    <span className={local.contextName}>{dish.name}</span>
                    <span className={local.contextMeta}>
                      {dish.course} · {dish.note}
                    </span>
                  </div>
                  {dish.pinned && <Icon className={local.contextPin} name="pin" role="img" aria-label="Pinned" />}
                  <DropdownMenu
                    align="end"
                    trigger={
                      <Button variant="ghost" className={local.contextMore} aria-label={`Actions for ${dish.name}`}>
                        <Icon name="more" />
                      </Button>
                    }
                  >
                    {actions(dish)}
                  </DropdownMenu>
                </li>
              }
            >
              {actions(dish)}
            </ContextMenu>
          ))}
        </ul>
        <p className={local.contextStatus}>
          <span role="status">{status}</span>
          {undo && (
            <Button ref={undoRef} variant="ghost" onClick={restore}>
              Undo
            </Button>
          )}
        </p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>An area, not a button</h2>
        <ContextMenu
          label="Actions for table 4"
          trigger={
            <div className={local.contextCanvas} tabIndex={0} role="group" aria-label="Seating plan, table 4">
              <span className={local.contextTable}>Table 4</span>
              <span className={styles.note}>Right-click anywhere: the menu opens from the pointer.</span>
            </div>
          }
        >
          <MenuItem icon={<Icon name="plus" />} onSelect={() => setStatus("Added a seat to table 4")}>
            Add a seat
          </MenuItem>
          <MenuItem icon={<Icon name="pencil" />} onSelect={() => setStatus("Renaming table 4")}>
            Rename table
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon name="list" />} disabled description="Every guest already has a seat.">
            Seat remaining guests
          </MenuItem>
        </ContextMenu>
      </section>
    </div>
  );
}
