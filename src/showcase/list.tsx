"use client";

import { useState } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { List, ListAction, ListItem } from "@registry/list/list";
import styles from "./showcase.module.css";

const GUESTS = [
  { id: "amara", name: "Amara Okafor", note: "Vegetarian", rsvp: "Going" },
  { id: "chen", name: "Chen Wei", note: "Bringing wine", rsvp: "Going" },
  { id: "grace", name: "Grace Kim", note: "Nut allergy", rsvp: "Maybe" },
];

export default function Showcase() {
  const [selected, setSelected] = useState("amara");

  return (
    <div className={styles.stack}>
      <List aria-label="Guests">
        {GUESTS.map((g) => (
          <ListItem
            key={g.id}
            leading={<Avatar name={g.name} size={40} decorative />}
            title={g.name}
            description={g.note}
            trailing={g.rsvp}
            current={selected === g.id}
            onClick={() => setSelected(g.id)}
            actions={<ListAction icon="copy" label={`Copy ${g.name}’s invitation link`} />}
          />
        ))}
      </List>
    </div>
  );
}
