"use client";

import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "@registry/tabs/tabs";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [tab, setTab] = useState("menu");
  return (
    <div className={styles.stack}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Dinner sections">
          <Tab value="menu">Menu</Tab>
          <Tab value="guests" count={12}>
            Guests
          </Tab>
          <Tab value="notes">Notes</Tab>
        </TabList>
        <TabPanel value="menu">Burrata, slow-roast lamb, lemon tart.</TabPanel>
        <TabPanel value="guests">12 coming, 2 maybe.</TabPanel>
        <TabPanel value="notes">Dessert on the patio if it&rsquo;s dry.</TabPanel>
      </Tabs>
    </div>
  );
}
