"use client";

import { useState } from "react";
import { Tab, TabList, Tabs } from "@registry/tabs/tabs";
import { useCycle } from "./use-cycle";

/** Guests reply while you look: the count rolls. */
const GUESTS = [12, 13, 14, 15];

/** The tab bar alone: the pill sliding between tabs is the demo, and the count changing. */
export default function Showcase() {
  const [tab, setTab] = useState("menu");
  const guests = GUESTS[useCycle(GUESTS.length, 2000)];
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabList aria-label="Dinner sections">
        <Tab value="menu">Menu</Tab>
        <Tab value="guests" count={guests}>
          Guests
        </Tab>
        <Tab value="notes">Notes</Tab>
      </TabList>
    </Tabs>
  );
}
