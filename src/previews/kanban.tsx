"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { Badge } from "@registry/badge/badge";
import { Icon } from "@registry/icons/icons";
import { Kanban, type KanbanCard } from "@registry/kanban/kanban";
import base from "./preview.module.css";
import styles from "./kanban.module.css";

const COLUMNS = [
  { id: "enquiry", title: "Enquiry" },
  { id: "quoted", title: "Quoted" },
  { id: "confirmed", title: "Confirmed" },
  { id: "done", title: "Done" },
];

function meta(owner: string, date: string, status?: ReactNode) {
  return (
    <>
      <Avatar name={owner} size={20} decorative />
      <span className={styles.date}>
        <Icon name="calendar" />
        {date}
      </span>
      {status && <span className={styles.status}>{status}</span>}
    </>
  );
}

const CARDS: KanbanCard[] = [
  {
    id: "okafor",
    columnId: "enquiry",
    title: "Okafor rehearsal dinner",
    content: "40 guests, family style. Asked about a nut-free dessert.",
    meta: meta("Maya Chen", "Sat, Nov 28", <Badge tone="accent" size="sm">New</Badge>),
  },
  {
    id: "halvorsen",
    columnId: "enquiry",
    title: "Halvorsen & Co. holiday lunch",
    content: "120 guests, buffet, needs a halal main",
    meta: meta("Theo Okafor", "Fri, Dec 11"),
  },
  {
    id: "bookclub",
    columnId: "enquiry",
    title: "Book club supper",
    content: "12 guests, all vegetarian",
    meta: meta("Priya Natarajan", "Thu, Dec 3"),
  },
  {
    id: "riverside",
    columnId: "quoted",
    title: "Riverside Clinic staff party",
    content: <>Quote sent: <span className={styles.figure}>$4,800</span> for 65</>,
    meta: meta("Theo Okafor", "Fri, Dec 18", <Badge tone="warning" size="sm" dot>Follow up</Badge>),
  },
  {
    id: "ines",
    columnId: "quoted",
    title: "Inès’s 40th birthday, a seven-course tasting menu for fourteen at home",
    content: <>Quote sent: <span className={styles.figure}>$1,350</span></>,
    meta: meta("Maya Chen", "Sat, Dec 5"),
  },
  {
    id: "northgate",
    columnId: "confirmed",
    title: "Northgate school fundraiser",
    content: "200 guests, canapés and a dessert table",
    meta: meta("Priya Natarajan", "Sat, Dec 12", <Badge tone="positive" size="sm" dot>Deposit paid</Badge>),
  },
  {
    id: "chen",
    columnId: "confirmed",
    title: "Chen family Lunar New Year",
    content: "30 guests, eight dishes, two of them fish",
    meta: meta("Maya Chen", "Tue, Feb 16"),
  },
];

let added = 0;

export function KanbanPreview() {
  const [cards, setCards] = useState(CARDS);
  const [note, setNote] = useState("");

  function move(cardId: string, toColumnId: string, toIndex: number) {
    setCards((all) => {
      const card = all.find((c) => c.id === cardId);
      if (!card) return all;
      const rest = all.filter((c) => c.id !== cardId);
      const column = rest.filter((c) => c.columnId === toColumnId);
      const before = column[toIndex];
      const at = before ? rest.indexOf(before) : rest.length;
      rest.splice(at, 0, { ...card, columnId: toColumnId });
      return rest;
    });
  }

  function add(columnId: string) {
    added += 1;
    setCards((all) => [
      { id: `new-${added}`, columnId, title: "New enquiry", content: "Add the guest count and the date", meta: meta("Maya Chen", "No date yet") },
      ...all,
    ]);
  }

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading} id="pipeline-heading">
          Catering pipeline
        </h2>
        <Kanban
          aria-labelledby="pipeline-heading"
          className={styles.board}
          columns={COLUMNS}
          cards={cards}
          onMove={move}
          onAdd={add}
          onOpen={(card) => setNote(`Opened ${card.title}.`)}
        />
        <p className={base.note}>{note || "Drag a card, or focus one and press Space. On a phone, hold a card to lift it."}</p>
      </section>
    </div>
  );
}
