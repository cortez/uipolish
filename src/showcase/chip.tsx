"use client";

import { useState } from "react";
import { Chip, ChipGroup } from "@registry/chip/chip";

const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Nut allergy", "No alcohol"];

export default function Showcase() {
  const [diets, setDiets] = useState<string[]>(["Vegetarian"]);
  const toggle = (d: string, on: boolean) => setDiets((v) => (on ? [...v, d] : v.filter((x) => x !== d)));
  return (
    // Centered in its card, like the other rows of small things.
    <ChipGroup aria-label="Dietary filters" style={{ justifyContent: "center" }}>
      {DIETS.map((d) => (
        <Chip key={d} pressed={diets.includes(d)} onPressedChange={(on) => toggle(d, on)}>
          {d}
        </Chip>
      ))}
    </ChipGroup>
  );
}
