"use client";

import { useState } from "react";
import { Chip, ChipGroup, RemovableChip } from "@registry/chip/chip";
import { Button } from "@registry/button/button";
import base from "./preview.module.css";
import styles from "./chip.module.css";

const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Nut-free", "Dairy-free"] as const;
type Diet = (typeof DIETS)[number];

const DISHES: { name: string; fits: Diet[] }[] = [
  { name: "Charred leeks, romesco", fits: ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free"] },
  { name: "Burrata, blood orange", fits: ["Vegetarian", "Gluten-free", "Nut-free"] },
  { name: "Mushroom and barley risotto", fits: ["Vegetarian", "Nut-free"] },
  { name: "Roast chicken, salsa verde", fits: ["Gluten-free", "Nut-free", "Dairy-free"] },
  { name: "Olive oil cake, poached pear", fits: ["Vegetarian", "Nut-free", "Dairy-free"] },
  { name: "Dark chocolate, hazelnut", fits: ["Vegetarian", "Gluten-free"] },
];

const NOTES = ["Vegan", "No mushrooms", "Sesame allergy", "Prefers still water"];
const MORE = ["Shellfish allergy", "No coriander", "Seat near the window"];

export function ChipPreview() {
  const [diets, setDiets] = useState<Diet[]>(["Vegetarian"]);
  const [notes, setNotes] = useState<string[]>(NOTES);
  const [announce, setAnnounce] = useState("");

  const dishes = DISHES.filter((d) => diets.every((x) => d.fits.includes(x)));
  const next = MORE.find((m) => !notes.includes(m));

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Menu for Friday</h2>
        <ChipGroup aria-label="Dietary filters">
          {DIETS.map((d) => (
            <Chip
              key={d}
              pressed={diets.includes(d)}
              onPressedChange={(on) => setDiets((v) => (on ? [...v, d] : v.filter((x) => x !== d)))}
            >
              {d}
            </Chip>
          ))}
          <Chip disabled>Halal</Chip>
        </ChipGroup>
        <p className={base.note}>Halal isn’t offered on this menu.</p>
        <ul className={styles.dishes} aria-live="polite">
          {dishes.length === 0 ? (
            <li className={styles.empty}>
              No dishes fit all {diets.length} filters.{" "}
              <Button variant="ghost" onClick={() => setDiets([])}>
                Clear filters
              </Button>
            </li>
          ) : (
            dishes.map((d) => <li key={d.name}>{d.name}</li>)
          )}
        </ul>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Priya’s notes for the kitchen</h2>
        <ChipGroup aria-label="Priya’s notes" className={styles.notes}>
          {notes.map((n) => (
            <RemovableChip
              key={n}
              onRemove={() => setNotes((v) => v.filter((x) => x !== n))}
            >
              {n}
            </RemovableChip>
          ))}
        </ChipGroup>
        <div className={base.row}>
          <Button
            variant="secondary"
            disabled={!next}
            onClick={() => {
              if (!next) return;
              setNotes((v) => [...v, next]);
              setAnnounce(`Added ${next}`);
            }}
          >
            {next ? `Add “${next}”` : "All notes added"}
          </Button>
          <Button variant="ghost" onClick={() => setNotes(NOTES)}>
            Reset
          </Button>
        </div>
        <p className={base.srOnly} role="status">
          {announce}
        </p>
      </section>
    </div>
  );
}
