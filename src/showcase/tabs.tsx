"use client";

import { useState } from "react";
import { Tab, TabList, Tabs } from "@registry/tabs/tabs";

/** The tab bar alone: the pill sliding between tabs is the demo. */
export default function Showcase() {
  const [tab, setTab] = useState("menu");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabList aria-label="Dinner sections">
        <Tab value="menu">Menu</Tab>
        <Tab value="guests" count={12}>
          Guests
        </Tab>
        <Tab value="notes">Notes</Tab>
      </TabList>
    </Tabs>
  );
}
