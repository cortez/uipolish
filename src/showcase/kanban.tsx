"use client";

import { useState } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { Badge } from "@registry/badge/badge";
import { Kanban, type KanbanCard } from "@registry/kanban/kanban";

const COLUMNS = [
  { id: "quoted", title: "Quoted" },
  { id: "confirmed", title: "Confirmed" },
];

const CARDS: KanbanCard[] = [
  { id: "riverside", columnId: "quoted", title: "Riverside Clinic party", meta: <><Avatar name="Theo Okafor" size={20} decorative /><Badge tone="warning" size="sm" dot>Follow up</Badge></> },
  { id: "ines", columnId: "quoted", title: "Inès’s 40th birthday", meta: <Avatar name="Maya Chen" size={20} decorative /> },
  { id: "northgate", columnId: "confirmed", title: "Northgate fundraiser", meta: <><Avatar name="Priya Natarajan" size={20} decorative /><Badge tone="positive" size="sm" dot>Deposit paid</Badge></> },
];

export default function Showcase() {
  const [cards, setCards] = useState(CARDS);

  return (
    <Kanban
      aria-label="Catering pipeline"
      style={{ height: 256, width: "100%" }}
      columns={COLUMNS}
      cards={cards}
      onMove={(cardId, toColumnId, toIndex) =>
        setCards((all) => {
          const card = all.find((c) => c.id === cardId)!;
          const rest = all.filter((c) => c.id !== cardId);
          const column = rest.filter((c) => c.columnId === toColumnId);
          const at = column[toIndex] ? rest.indexOf(column[toIndex]) : rest.length;
          rest.splice(at, 0, { ...card, columnId: toColumnId });
          return rest;
        })
      }
    />
  );
}
