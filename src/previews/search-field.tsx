"use client";

import { useEffect, useState } from "react";
import { SearchField } from "@registry/search-field/search-field";
import base from "./preview.module.css";
import styles from "./search-field.module.css";

const GUESTS = [
  { name: "Maya Okafor", rsvp: "Hosting" },
  { name: "Priya Raman", rsvp: "Coming, plus one" },
  { name: "Daniel Brooks", rsvp: "Coming" },
  { name: "Lena Fischer", rsvp: "Maybe" },
  { name: "Tomás Herrera", rsvp: "Coming" },
  { name: "Aiko Tanaka", rsvp: "Can’t make it" },
];

const RECIPES = [
  "Charred leeks, hazelnut romesco",
  "Lemon tart with burnt meringue",
  "Slow-roast lamb shoulder",
  "Sourdough with cultured butter",
  "Blood orange and fennel salad",
  "Brown butter madeleines",
];

export function SearchFieldPreview() {
  const [query, setQuery] = useState("");
  const shown = GUESTS.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()));

  // The recipe archive answers after a moment, like a server would.
  const [recipeQuery, setRecipeQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: string[] }>({ query: "", items: [] });
  const loading = recipeQuery.trim() !== "" && results.query !== recipeQuery.trim();
  useEffect(() => {
    const q = recipeQuery.trim();
    if (!q) return;
    const timer = window.setTimeout(() => {
      setResults({ query: q, items: RECIPES.filter((r) => r.toLowerCase().includes(q.toLowerCase())) });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [recipeQuery]);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Guest list</h2>
          <p className={base.note}>Saturday supper · 6 invited</p>
        </div>
        <SearchField
          label="Search guests"
          placeholder="Search guests"
          shortcut="/"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className={styles.list} aria-label="Guests">
          {shown.map((g) => (
            <li key={g.name} className={styles.row}>
              <span>{g.name}</span>
              <span className={base.note}>{g.rsvp}</span>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className={styles.empty}>
            No guests match “{query.trim()}”. Try a first name, or press Escape to clear.
          </p>
        )}
        <p className={base.srOnly} role="status">
          {query.trim() ? `${shown.length} of ${GUESTS.length} guests` : ""}
        </p>
      </section>

      <section className={base.group}>
        <SearchField
          label="Recipes"
          showLabel
          placeholder="Leeks, tart, lamb…"
          value={recipeQuery}
          loading={loading}
          onChange={(e) => setRecipeQuery(e.target.value)}
        />
        <p className={base.note} aria-live="polite">
          {!recipeQuery.trim()
            ? "Search the menus from every past supper."
            : loading
              ? " "
              : results.items.length === 0
                ? `No recipes for “${results.query}”.`
                : results.items.join(" · ")}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>States</h2>
        <div className={styles.states}>
          <SearchField label="Search the wine list" placeholder="Search the wine list" defaultValue="Riesling" />
          <SearchField label="Search past dinners" placeholder="Search past dinners" defaultValue="lamb" loading />
          <SearchField label="Search invitations" placeholder="Invitations open on Monday" disabled shortcut="/" />
        </div>
      </section>
    </div>
  );
}
