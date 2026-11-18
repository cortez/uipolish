"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { Icon, type IconName } from "@registry/icons/icons";
import { List, ListAction, ListItem } from "@registry/list/list";
import base from "./preview.module.css";
import styles from "./list.module.css";

type Guest = {
  id: string;
  name: string;
  note: string;
  rsvp: "Going" | "Maybe" | "Invited";
  bounced?: boolean;
};

const GUESTS: Guest[] = [
  { id: "maya", name: "Maya Chen", note: "Vegetarian · bringing the bread", rsvp: "Going" },
  { id: "priya", name: "Priya Natarajan", note: "Plus one: Arjun", rsvp: "Going" },
  { id: "theo", name: "Theo Okafor", note: "Asked to sit near the window, away from the speakers and the kitchen door", rsvp: "Maybe" },
  { id: "alexandria", name: "Alexandria Konstantinopoulou-Whitfield", note: "Opened the invitation yesterday", rsvp: "Invited" },
  { id: "sam", name: "Sam Ortiz", note: "Invitation bounced. Fix the email to send it again.", rsvp: "Invited", bounced: true },
];

const SETTINGS: { id: string; icon: IconName; title: string; description: string; value: string }[] = [
  { id: "menu", icon: "file", title: "Menu", description: "Four courses, two of them vegetarian", value: "4 courses" },
  { id: "date", icon: "calendar", title: "Date and time", description: "Friday, October 30, doors at 7:00", value: "Oct 30" },
  { id: "link", icon: "link", title: "Invitation link", description: "example.com/d/friday-supper-at-mayas-on-the-thirtieth", value: "On" },
  { id: "notes", icon: "info", title: "Dietary notes from guests who replied after the RSVP deadline", description: "Two new: no shellfish, no nuts", value: "2" },
];

const COURSES = [
  { title: "Burrata with charred peaches", by: "Priya", time: "7:30" },
  { title: "Sourdough and cultured butter", by: "Maya", time: "7:30" },
  { title: "Braised short ribs, polenta, gremolata", by: "Theo", time: "8:15" },
  { title: "Olive oil cake", by: "Maya", time: "9:00" },
];

export function ListPreview() {
  const [selected, setSelected] = useState("maya");
  const [page, setPage] = useState("menu");
  const [copied, setCopied] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(guest: Guest) {
    const link = `https://example.com/d/friday-supper?guest=${guest.id}`;
    try {
      if (!navigator.clipboard) throw new Error("No clipboard");
      await navigator.clipboard.writeText(link);
      setCopied(guest.id);
      setStatus(`Copied ${guest.name}’s invitation link`);
    } catch {
      setCopied(null);
      setStatus(`Couldn’t copy. The link is ${link}`);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1600);
  }

  const going = GUESTS.filter((g) => g.rsvp === "Going").length;
  const current = GUESTS.find((g) => g.id === selected);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading} id="guests-heading">
            Guests
          </h2>
          <p className={base.note}>
            {GUESTS.length} invited · {going} going
          </p>
        </div>
        <List aria-labelledby="guests-heading">
          {GUESTS.map((guest) => (
            <ListItem
              key={guest.id}
              leading={<Avatar name={guest.name} size={40} decorative />}
              title={guest.name}
              description={guest.note}
              trailing={guest.rsvp}
              current={selected === guest.id}
              disabled={guest.bounced}
              onClick={() => setSelected(guest.id)}
              actions={
                <ListAction
                  icon={copied === guest.id ? "check" : "copy"}
                  label={`Copy ${guest.name}’s invitation link`}
                  disabled={guest.bounced}
                  onClick={() => copy(guest)}
                />
              }
            />
          ))}
        </List>
        <p className={base.note} aria-live="polite">
          {status || (current ? `Seating ${current.name}.` : "")}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label} id="settings-heading">
          Links, with a chevron
        </h2>
        <List aria-labelledby="settings-heading">
          {SETTINGS.map((s) => (
            <ListItem
              key={s.id}
              leading={<Icon name={s.icon} />}
              title={s.title}
              description={s.description}
              trailing={s.value}
              chevron
              href={`#${s.id}`}
              current={page === s.id}
              onClick={(e) => {
                e.preventDefault();
                setPage(s.id);
              }}
            />
          ))}
          <ListItem
            leading={<Icon name="trash" />}
            title="Cancel the dinner"
            description="Only the host can cancel. Ask Maya."
            chevron
            href="#cancel"
            disabled
          />
        </List>
      </section>

      <section className={base.group}>
        <h2 className={base.label} id="courses-heading">
          Plain, static rows
        </h2>
        <List variant="plain" aria-labelledby="courses-heading">
          {COURSES.map((c) => (
            <ListItem key={c.title} title={c.title} description={`Made by ${c.by}`} trailing={c.time} />
          ))}
        </List>
      </section>
    </div>
  );
}
