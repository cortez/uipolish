"use client";

import { useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Drawer, DrawerActions } from "@registry/drawer/drawer";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { Switch } from "@registry/switch/switch";
import { TextField } from "@registry/text-field/text-field";
import base from "./preview.module.css";
import styles from "./drawer.module.css";

type Rsvp = "waiting" | "going" | "maybe" | "declined";

type Guest = {
  id: string;
  name: string;
  rsvp: Rsvp;
  diet: string;
  plusOne: boolean;
  history: { supper: string; date: string; came: boolean }[];
};

const RSVP_LABEL: Record<Rsvp, string> = {
  waiting: "No reply",
  going: "Going",
  maybe: "Maybe",
  declined: "Can’t come",
};

const PAST = ["Harvest supper", "Dumpling night", "Midsummer table", "Soup swap", "Book club supper", "New Year’s brunch"];
const DATES = ["Sep 26", "Aug 15", "Jun 21", "Mar 8", "Feb 2", "Jan 4"];

function history(pattern: string) {
  return [...pattern].map((c, i) => ({ supper: PAST[i], date: DATES[i], came: c === "1" }));
}

const GUESTS: Guest[] = [
  { id: "priya", name: "Priya Raman", rsvp: "going", diet: "Vegetarian", plusOne: true, history: history("111011") },
  { id: "amara", name: "Amara Okafor", rsvp: "going", diet: "", plusOne: false, history: history("1101") },
  { id: "theo", name: "Theo Lindqvist", rsvp: "maybe", diet: "", plusOne: false, history: history("0110") },
  { id: "lucia", name: "Lucía Ortega", rsvp: "going", diet: "No shellfish", plusOne: false, history: history("11") },
  { id: "jonah", name: "Jonah Park", rsvp: "waiting", diet: "", plusOne: false, history: history("1") },
  { id: "noor", name: "Noor Haddad", rsvp: "going", diet: "Tree nut allergy", plusOne: true, history: history("101110") },
  { id: "sam", name: "Sam Whitfield", rsvp: "declined", diet: "", plusOne: false, history: history("100") },
];

type Filters = { rsvp: Rsvp[]; dietOnly: boolean };
const ALL: Filters = { rsvp: ["going", "maybe", "waiting", "declined"], dietOnly: false };

function count(n: number) {
  return n === 1 ? "1 guest" : `${n} guests`;
}

function matches(guest: Guest, filters: Filters) {
  return filters.rsvp.includes(guest.rsvp) && (!filters.dietOnly || guest.diet.trim() !== "");
}

export function DrawerPreview() {
  const [guests, setGuests] = useState(GUESTS);
  const [openId, setOpenId] = useState<string | null>(null);
  // The guest the drawer shows. Kept after it closes, so the panel still has
  // its content while it slides away.
  const [shownId, setShownId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(ALL);
  const [draft, setDraft] = useState<Filters>(ALL);
  const [filtering, setFiltering] = useState(false);
  const [status, setStatus] = useState("");
  // A removed guest stays drawn in the drawer while it slides away.
  const [removed, setRemoved] = useState<Guest | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);

  const guest = guests.find((g) => g.id === shownId) ?? (removed?.id === shownId ? removed : null);
  const shown = guests.filter((g) => matches(g, filters));
  const draftCount = guests.filter((g) => matches(g, draft)).length;
  const filtered = filters.rsvp.length !== ALL.rsvp.length || filters.dietOnly;
  const going = guests.filter((g) => g.rsvp === "going").reduce((n, g) => n + (g.plusOne ? 2 : 1), 0);

  function update(patch: Partial<Guest>) {
    setGuests((list) => list.map((g) => (g.id === shownId ? { ...g, ...patch } : g)));
  }

  function remove() {
    if (!guest) return;
    setRemoved(guest);
    setGuests((list) => list.filter((g) => g.id !== guest.id));
    setOpenId(null);
    // Its row is gone, so focus lands on the list's heading (finalFocus).
    setStatus(`${guest.name} removed from the list`);
  }

  function openFilters() {
    setDraft(filters);
    setFiltering(true);
  }

  function toggleRsvp(rsvp: Rsvp, on: boolean) {
    setDraft((d) => ({ ...d, rsvp: on ? [...d.rsvp, rsvp] : d.rsvp.filter((r) => r !== rsvp) }));
  }

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.toolbar}>
          <div className={styles.header}>
            <h2 ref={listHeading} tabIndex={-1} className={base.heading}>
              Friday supper
            </h2>
            <p className={base.note}>
              {going} coming, counting plus-ones · RSVP by Wed, Nov 5
            </p>
          </div>
          <Button variant="secondary" onClick={openFilters}>
            {filtered ? `Filters · ${shown.length}` : "Filters"}
          </Button>
        </div>

        {shown.length ? (
          <ul className={styles.list}>
            {shown.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => {
                    setShownId(g.id);
                    setOpenId(g.id);
                  }}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {g.name[0]}
                  </span>
                  <span className={styles.name}>
                    {g.name}
                    {g.plusOne && <span className={styles.meta}> + 1</span>}
                  </span>
                  <span className={styles.rsvp} data-rsvp={g.rsvp}>
                    {RSVP_LABEL[g.rsvp]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No guests match these filters</p>
            <Button variant="secondary" onClick={() => setFilters(ALL)}>
              Clear filters
            </Button>
          </div>
        )}
        <p className={base.note}>
          Open a guest for their details, or Filters for a panel from the other edge. On a phone both rise
          from the bottom; drag the handle down to dismiss.
        </p>
        <span role="status" className={base.srOnly}>
          {status}
        </span>
      </section>

      <Drawer
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        title={guest?.name ?? ""}
        description="Invited Oct 12 · Friday supper"
        finalFocus={listHeading}
        footer={
          <DrawerActions>
            <Button variant="secondary" onClick={remove}>
              Remove guest
            </Button>
            <Button onClick={() => setOpenId(null)}>Done</Button>
          </DrawerActions>
        }
      >
        {guest && (
          <div className={styles.sections}>
            <section className={styles.section}>
              <h3 className={base.label}>RSVP</h3>
              <SegmentedControl
            size="sm"
                aria-label="RSVP"
                widths="equal"
                value={guest.rsvp}
                onValueChange={(v) => update({ rsvp: v as Rsvp })}
              >
                <Segment value="going">Going</Segment>
                <Segment value="maybe">Maybe</Segment>
                <Segment value="declined">Can’t</Segment>
                <Segment value="waiting">No reply</Segment>
              </SegmentedControl>
            </section>

            <section className={styles.section}>
              <TextField
                label="Dietary notes"
                placeholder="None"
                hint="Shows on the menu card at their seat."
                value={guest.diet}
                onChange={(e) => update({ diet: e.target.value })}
              />
              <Switch
                label="Bringing a plus-one"
                description="Sets a second place beside them."
                checked={guest.plusOne}
                onChange={(e) => update({ plusOne: e.target.checked })}
              />
            </section>

            <section className={styles.section}>
              <h3 className={base.label}>Past suppers</h3>
              <ul className={styles.history}>
                {guest.history.map((h) => (
                  <li key={h.supper} className={styles.past}>
                    <span>{h.supper}</span>
                    <span className={styles.meta}>
                      {h.date} · {h.came ? "Came" : "Couldn’t make it"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>

      <Drawer
        open={filtering}
        onOpenChange={setFiltering}
        side="start"
        size="sm"
        title="Filter guests"
        footer={
          <DrawerActions>
            <Button variant="secondary" onClick={() => setDraft(ALL)}>
              Reset
            </Button>
            <Button
              onClick={() => {
                setFilters(draft);
                setFiltering(false);
              }}
            >
              {`Show ${count(draftCount)}`}
            </Button>
          </DrawerActions>
        }
      >
        <div className={styles.sections}>
          <fieldset className={styles.fieldset}>
            <legend className={base.label}>RSVP</legend>
            {(["going", "maybe", "waiting", "declined"] as Rsvp[]).map((r) => (
              <Checkbox
                key={r}
                label={RSVP_LABEL[r]}
                description={count(guests.filter((g) => g.rsvp === r).length)}
                checked={draft.rsvp.includes(r)}
                onCheckedChange={(on) => toggleRsvp(r, on)}
              />
            ))}
          </fieldset>
          <Switch
            label="Only guests with dietary notes"
            description="For planning the menu."
            checked={draft.dietOnly}
            onChange={(e) => setDraft({ ...draft, dietOnly: e.target.checked })}
          />
        </div>
      </Drawer>
    </div>
  );
}
