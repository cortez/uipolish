"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CommandPalette, type Command, type CommandSource } from "@registry/command-palette/command-palette";
import { fuzzyMatch } from "@registry/command-palette/fuzzy";
import { Icon } from "@registry/icons/icons";
import styles from "./command-palette.module.css";

const icon = (d: string) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke)" }} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  plus: <Icon name="plus" />,
  doc: icon("M4.5 2.5h4.5l2.5 2.5v8.5h-7z M9 2.5V5h2.5"),
  send: <Icon name="send" />,
  duplicate: <Icon name="duplicate" />,
  moon: icon("M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z"),
  sun: icon("M8 5.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"),
  percent: icon("M4 12L12 4 M5 4.5a.5.5 0 100 1 .5.5 0 000-1z M11 10.5a.5.5 0 100 1 .5.5 0 000-1z"),
  person: icon("M8 8a2.75 2.75 0 100-5.5A2.75 2.75 0 008 8z M3 13.5c.6-2.3 2.6-3.5 5-3.5s4.4 1.2 5 3.5"),
};

const CLIENTS = [
  { id: "dana", name: "Dana Whitfield", address: "14 Alder Lane" },
  { id: "marcus", name: "Marcus Osei", address: "9 Birch Court" },
  { id: "priya", name: "Priya Raman", address: "302 Cedar Street" },
  { id: "varga", name: "Tom and Ellen Varga", address: "7 Ridge Road" },
  { id: "lucia", name: "Lucía Moreno", address: "41 Harbor View" },
  { id: "ben", name: "Ben Adeyemi", address: "118 Orchard Way" },
];

function useRootTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setDark(
        root.dataset.theme === "dark" ||
          (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches),
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const toggle = useCallback(() => {
    document.documentElement.dataset.theme = dark ? "light" : "dark";
  }, [dark]);
  return [dark, toggle] as const;
}

export function CommandPalettePreview() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [dark, toggleTheme] = useRootTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "new", label: "New event", group: "Events", icon: ICONS.plus, shortcut: ["⌘", "N"], keywords: ["create", "plan", "dinner"], onSelect: () => setLast("New event") },
      { id: "open-alder", label: "Open Saturday supper", group: "Events", icon: ICONS.doc, hint: "14 Alder Lane", onSelect: () => setLast("Opened Saturday supper") },
      { id: "open-birch", label: "Open the harvest dinner", group: "Events", icon: ICONS.doc, hint: "9 Birch Court", onSelect: () => setLast("Opened the harvest dinner") },
      { id: "send", label: "Send invitations to guests", group: "Events", icon: ICONS.send, shortcut: ["⌘", "I"], keywords: ["email", "share", "invite"], onSelect: () => setLast("Sent invitations for Saturday supper") },
      { id: "duplicate", label: "Duplicate event", group: "Events", icon: ICONS.duplicate, shortcut: ["⌘", "D"], keywords: ["copy"], onSelect: () => setLast("Duplicated Saturday supper") },
      {
        id: "theme",
        label: dark ? "Switch to light mode" : "Switch to dark mode",
        group: "Settings",
        icon: dark ? ICONS.sun : ICONS.moon,
        keywords: ["theme", "appearance", "night"],
        onSelect: () => {
          toggleTheme();
          setLast(dark ? "Switched to light mode" : "Switched to dark mode");
        },
      },
      { id: "tax", label: "Edit tax rates", group: "Settings", icon: ICONS.percent, keywords: ["vat", "sales tax"], onSelect: () => setLast("Edit tax rates") },
    ],
    [dark, toggleTheme],
  );

  const sources = useMemo<CommandSource[]>(
    () => [
      {
        id: "clients",
        heading: "Guests",
        loadingLabel: "Searching guests…",
        search: (query, signal) =>
          new Promise((resolve, reject) => {
            // A pretend network: slow enough that the loading row shows.
            const timer = setTimeout(() => {
              const found = CLIENTS.map((c) => ({ c, m: fuzzyMatch(query, `${c.name} ${c.address}`) }))
                .filter((x) => x.m)
                .sort((a, b) => b.m!.score - a.m!.score)
                .slice(0, 4)
                .map(({ c }) => ({
                  id: `client-${c.id}`,
                  label: c.name,
                  hint: c.address,
                  icon: ICONS.person,
                  keywords: [c.address],
                  onSelect: () => setLast(`Opened ${c.name}`),
                }));
              resolve(found);
            }, 650);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(signal.reason);
            });
          }),
      },
    ],
    [],
  );

  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Events</h2>
        <button ref={triggerRef} type="button" className={styles.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Icon name="search" />
          <span className={styles.triggerText}>Search events, guests, commands</span>
          <span className={styles.keys} aria-hidden="true">
            <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
            <kbd>K</kbd>
          </span>
        </button>
        <p className={styles.note} aria-live="polite">
          {last ? `Last command: ${last}` : "Press ⌘K or Ctrl+K anywhere. Try “alder”, “sig”, “dark”, or a guest like “priya”."}
        </p>
      </section>

      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        sources={sources}
        triggerRef={triggerRef}
        placeholder="Search events, guests, commands…"
        emptyHint="Try a guest’s name, an address like “Alder”, or a command like “new”."
      />
    </div>
  );
}
