"use client";

import { useEffect, useState } from "react";
import { Button } from "@registry/button/button";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@registry/tabs/tabs";
import styles from "./tabs.module.css";
import base from "./preview.module.css";

const LINE_ITEMS = [
  { item: "Lamb shoulder, bone-in", qty: "2.8 kg", amount: "$106.40" },
  { item: "White beans", qty: "4 jars", amount: "$18.40" },
  { item: "Sourdough loaves", qty: "2", amount: "$14.00" },
  { item: "Lemon tarts", qty: "2", amount: "$52.00" },
  { item: "Red wine", qty: "6 bottles", amount: "$108.00" },
];

const ACTIVITY = [
  { who: "Dana Whitfield", what: "opened the invitation", when: "Today, 9:14 AM" },
  { who: "You", what: "moved dessert to the patio", when: "Yesterday, 4:02 PM" },
  { who: "You", what: "sent the invitation to dana.whitfield@example.com", when: "Oct 20, 11:30 AM" },
  { who: "You", what: "created the event", when: "Oct 20, 10:47 AM" },
];

const MORE_GUESTS = [
  "Marcus Lee",
  "Sam Okafor",
  "Lena Fischer",
  "Tom Brennan",
  "Ines Duarte",
  "Kenji Mori",
  "Rosa Alvarez",
  "Owen Park",
  "Hana Sato",
];

// The preview prints the URL so you can watch the param change.
function useSearch() {
  const [search, setSearch] = useState("");
  useEffect(() => {
    const read = () => setSearch(window.location.search);
    const frame = requestAnimationFrame(read);
    window.addEventListener("popstate", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", read);
    };
  }, []);
  // Tabs writes the URL right after onValueChange; read it a tick later.
  const refresh = () => queueMicrotask(() => setSearch(window.location.search));
  return [search, refresh] as const;
}

export function TabsPreview() {
  const [search, refreshSearch] = useSearch();
  const [section, setSection] = useState("overview");
  const [guests, setGuests] = useState(["Maya Chen", "Priya Natarajan", "Dana Whitfield", ...MORE_GUESTS.slice(0, 6)]);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Saturday supper, 14 Alder Lane</h2>
          <p className={base.note}>Event #1182 · 14 guests</p>
        </div>

        <Tabs defaultValue="items" param="tab" crossfade onValueChange={refreshSearch}>
          <TabList aria-label="Event sections">
            <Tab value="items" count={LINE_ITEMS.length}>
              Shopping
            </Tab>
            <Tab value="notes">Notes</Tab>
            <Tab value="activity" count={ACTIVITY.length}>
              Activity
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel value="items">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {LINE_ITEMS.map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>{row.qty}</td>
                      <td>{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabPanel>

            <TabPanel value="notes">
              <div className={styles.notes}>
                <p>
                  The long table seats 12 with both leaves in. Two more chairs come from next door, and the bench goes
                  on the window side.
                </p>
                <p>
                  Dana asked for dessert on the patio rather than at the table. That frees the dining room by nine and
                  moves coffee outside.
                </p>
                <p className={base.note}>Dietary notes are due Thursday. Maya shops on Friday morning.</p>
              </div>
            </TabPanel>

            <TabPanel value="activity">
              <ol className={styles.activity}>
                {ACTIVITY.map((entry) => (
                  <li key={entry.when}>
                    <span>
                      <strong>{entry.who}</strong> {entry.what}
                    </span>
                    <time>{entry.when}</time>
                  </li>
                ))}
              </ol>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <p className={styles.url}>
          <span className={base.note}>URL</span>
          <code>/preview/tabs{search || "?tab=items"}</code>
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Vertical, as a settings sidebar</h2>
        <Tabs defaultValue="guests" orientation="vertical" crossfade>
          <TabList aria-label="Event settings">
            <Tab value="general">General</Tab>
            <Tab value="guests" count={guests.length}>
              Guests
            </Tab>
            <Tab value="menu" count={3}>
              Menu
            </Tab>
            <Tab value="reminders">Reminders</Tab>
            <Tab value="sharing">Sharing</Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="general">
              <dl className={styles.facts}>
                <dt>Event</dt>
                <dd>Saturday supper</dd>
                <dt>Date</dt>
                <dd>Saturday, November 7, 7:30 PM</dd>
                <dt>Host</dt>
                <dd>Maya Chen</dd>
              </dl>
            </TabPanel>
            <TabPanel value="guests">
              <div className={styles.guests}>
                <p className={styles.guestList}>{guests.join(", ")}</p>
                <div className={base.row}>
                  <Button
                    variant="secondary"
                    disabled={guests.length === MORE_GUESTS.length + 3}
                    onClick={() => setGuests((g) => [...g, MORE_GUESTS[g.length - 3]])}
                  >
                    Add a guest
                  </Button>
                  <Button variant="ghost" disabled={guests.length === 1} onClick={() => setGuests((g) => g.slice(0, -1))}>
                    Remove the last
                  </Button>
                </div>
              </div>
            </TabPanel>
            <TabPanel value="menu">
              <ol className={styles.activity}>
                <li>Lamb shoulder with white beans</li>
                <li>Bitter leaves, blood orange</li>
                <li>Lemon tart</li>
              </ol>
            </TabPanel>
            <TabPanel value="reminders">
              <p className={base.note}>Guests get a reminder the day before, with the address and the gate code.</p>
            </TabPanel>
            <TabPanel value="sharing">
              <p className={base.note}>Anyone with the invitation link can RSVP. Priya can edit the menu.</p>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <p className={base.note}>Up and Down move between the tabs. Under 480px wide, the list becomes a row.</p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Manual activation, controlled</h2>
        <Tabs value={section} onValueChange={setSection} manual>
          <TabList aria-label="Plan sections">
            <Tab value="overview">Overview</Tab>
            <Tab value="schedule">Schedule</Tab>
            <Tab value="materials">Shopping</Tab>
            <Tab value="photos">Photos</Tab>
          </TabList>
          <TabPanel value="overview">
            <p className={base.note}>Arrow keys move focus. Enter or Space opens the tab.</p>
          </TabPanel>
          <TabPanel value="schedule">
            <p className={base.note}>Guests arrive at 7:30. Mains at 8:15. Dessert on the patio at 9.</p>
          </TabPanel>
          <TabPanel value="materials">
            <p className={base.note}>Maya shops Friday morning at the market on Route 9.</p>
          </TabPanel>
          <TabPanel value="photos">
            <p className={base.note}>No photos yet. Add some from your phone after the dinner.</p>
          </TabPanel>
        </Tabs>
      </section>
    </div>
  );
}
