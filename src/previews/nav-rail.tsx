"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { NavRail, NavRailTrigger, type NavRailItem } from "@registry/nav-rail/nav-rail";
import { Avatar } from "@registry/avatar/avatar";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Kbd } from "@registry/kbd/kbd";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import base from "./preview.module.css";
import styles from "./nav-rail.module.css";

/* Glyphs the icon set doesn't have yet, drawn on its 16-unit grid. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      {children}
    </svg>
  );
}

const GUESTS = (
  <Glyph>
    <circle cx="6" cy="5.5" r="2.25" />
    <path d="M2 13c.5-2.2 2-3.5 4-3.5s3.5 1.3 4 3.5" />
    <path d="M10.5 3.6a2.25 2.25 0 0 1 0 3.8M12 9.9c1 .5 1.7 1.6 2 3.1" />
  </Glyph>
);

const BASKET = (
  <Glyph>
    <path d="M2.5 6.5h11l-1.2 6a1.5 1.5 0 0 1-1.5 1.2H5.2a1.5 1.5 0 0 1-1.5-1.2z" />
    <path d="M5.5 6.5 7 2.5M10.5 6.5 9 2.5" />
  </Glyph>
);

const BUBBLE = (
  <Glyph>
    <path d="M2.5 7.5c0-2.8 2.5-4.75 5.5-4.75s5.5 1.95 5.5 4.75S11 12.25 8 12.25c-.8 0-1.5-.1-2.2-.35L3 13.25l.75-2.4C2.95 10 2.5 8.8 2.5 7.5" />
  </Glyph>
);

const GEAR = (
  <Glyph>
    <path d="M12.25 5.57 14.09 6.38v3.24l-1.84.81-.02.04.22 1.99-2.81 1.62-1.62-1.18h-.04l-1.62 1.18-2.81-1.62.22-1.99-.02-.04-1.84-.81V6.38l1.84-.81.02-.04-.22-1.99 2.81-1.62 1.62 1.18h.04l1.62-1.18 2.81 1.62-.22 1.99z" />
    <circle cx="8" cy="8" r="1.75" />
  </Glyph>
);

type Section = "today" | "guests" | "menus" | "shopping" | "messages" | "settings";

const PAGES: Record<Section, { title: string; note: string; rows: [string, string][] }> = {
  today: {
    title: "Saturday supper",
    note: "Doors at 7. Fourteen seats, twelve taken.",
    rows: [
      ["Prep the stock", "2:00 pm"],
      ["Collect the bread from Hearth", "4:30 pm"],
      ["Set the long table", "6:00 pm"],
    ],
  },
  guests: {
    title: "Guests",
    note: "Twelve confirmed, two on the waitlist.",
    rows: [
      ["Maya Chen", "Vegetarian"],
      ["Theo Okafor", "No shellfish"],
      ["Priya Natarajan", "Plus one"],
    ],
  },
  menus: {
    title: "Menus",
    note: "Autumn harvest, five courses.",
    rows: [
      ["Roast squash soup", "Starter"],
      ["Wild mushroom risotto", "Main"],
      ["Pear and almond tart", "Dessert"],
    ],
  },
  shopping: {
    title: "Shopping",
    note: "Copper split the list by shop. Nine items left.",
    rows: [
      ["Arborio rice, 2 kg", "Market"],
      ["Chestnut mushrooms, 1.5 kg", "Greengrocer"],
      ["Comice pears, 8", "Greengrocer"],
    ],
  },
  messages: {
    title: "Messages",
    note: "Guests write here; Copper drafts replies for you to send.",
    rows: [
      ["Maya Chen", "Can I bring a friend?"],
      ["Theo Okafor", "Running ten minutes late"],
      ["Lena Fischer", "Is there parking nearby?"],
    ],
  },
  settings: {
    title: "Settings",
    note: "How Acme reaches you, and how guests pay.",
    rows: [
      ["Notifications", "Email and push"],
      ["Payouts", "Weekly, to account ending 4021"],
      ["Copper", "Asks before messaging guests"],
    ],
  },
};

const NARROW = "(max-width: 560px)";
function subscribeNarrow(onChange: () => void) {
  const query = matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function NavRailPreview() {
  const [section, setSection] = useState<Section>("today");
  const [unread, setUnread] = useState(3);
  const [chosen, setOrientation] = useState<"vertical" | "horizontal" | null>(null);
  // A phone gets the bottom bar until you pick.
  const narrow = useSyncExternalStore(subscribeNarrow, () => matchMedia(NARROW).matches, () => false);
  const orientation = chosen ?? (narrow ? "horizontal" : "vertical");

  const items: NavRailItem[] = [
    { id: "today", label: "Today", icon: <Icon name="calendar" />, shortcut: "1" },
    { id: "guests", label: "Guests", icon: GUESTS, shortcut: "2" },
    { id: "menus", label: "Menus", icon: <Icon name="file" />, shortcut: "3" },
    { id: "shopping", label: "Shopping list", icon: BASKET, shortcut: "4" },
    { id: "messages", label: "Messages", icon: BUBBLE, shortcut: "5", badge: unread },
    { id: "settings", label: "Settings", icon: GEAR, shortcut: "6" },
  ];

  function go(id: string) {
    setSection(id as Section);
    if (id === "messages") setUnread(0);
  }

  const page = PAGES[section];
  const horizontal = orientation === "horizontal";

  const rail = (
    <NavRail
      aria-label="Acme"
      className={horizontal ? undefined : styles.rail}
      items={items}
      value={section}
      onValueChange={go}
      orientation={orientation}
      fixed={horizontal}
      shortcuts
      footer={
        <NavRailTrigger label="Ana Ruiz">
          <button type="button" aria-label="Ana Ruiz, account">
            <Avatar name="Ana Ruiz" size={24} decorative />
          </button>
        </NavRailTrigger>
      }
    />
  );

  const content = (
    <section className={styles.content} aria-label={page.title}>
      <div key={section} className={styles.page}>
        <h2 className={styles.title}>{page.title}</h2>
        <p className={base.note}>{page.note}</p>
        <ul className={styles.rows}>
          {page.rows.map(([name, meta]) => (
            <li key={name} className={styles.row}>
              <span className={styles.rowName}>{name}</span>
              <span className={styles.rowMeta}>{meta}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <SegmentedControl
            aria-label="Layout"
            size="sm"
            widths="content"
            value={orientation}
            onValueChange={(v) => setOrientation(v as "vertical" | "horizontal")}
          >
            <Segment value="vertical">Side rail</Segment>
            <Segment value="horizontal">Bottom bar</Segment>
          </SegmentedControl>
          <Button
            variant="secondary"
            onClick={() => setUnread((n) => n + 1)}
            disabled={section === "messages"}
          >
            A guest writes
          </Button>
        </div>

        {orientation === "horizontal" ? (
          /* The same window as the side rail, with the bar pinned to its
             bottom edge and the page scrolling behind it. */
          <div className={`${styles.shell} ${styles.bottom}`}>
            <div className={styles.scroller}>{content}</div>
            {rail}
          </div>
        ) : (
          <div className={styles.shell}>
            {rail}
            {content}
          </div>
        )}

        <p className={base.note}>
          Move down the rail: the first label waits, the rest follow at once. Tab and the arrow keys do the same,
          and <Kbd keys={["ctrl", "1"]} size="sm" /> to <Kbd keys={["ctrl", "6"]} size="sm" /> jump straight there.
          On a phone, hold an icon to see its name, slide to another and lift to go there.
        </p>
      </section>
    </div>
  );
}
