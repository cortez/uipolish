"use client";

import { useState } from "react";
import { Icon } from "@registry/icons/icons";
import { ContextMenu } from "@registry/context-menu/context-menu";
import { MenuCheckboxItem, MenuItem, MenuSeparator } from "@registry/dropdown-menu/dropdown-menu";
import { List, ListItem } from "@registry/list/list";
import styles from "./showcase.module.css";

const DISHES = [
  { id: "soup", name: "Roasted squash soup", course: "Starter" },
  { id: "rib", name: "Braised short rib", course: "Main" },
  { id: "tart", name: "Apple tart", course: "Dessert" },
];

export default function Showcase() {
  const [pinned, setPinned] = useState("soup");

  return (
    <div className={styles.stack}>
      <List aria-label="Dishes. Right-click one for its actions.">
        {DISHES.map((dish) => (
          <ContextMenu
            key={dish.id}
            label={`Actions for ${dish.name}`}
            trigger={<ListItem title={dish.name} description={dish.course} trailing={pinned === dish.id ? "Pinned" : undefined} />}
          >
            <MenuItem icon={<Icon name="duplicate" />} shortcut="⌘D">
              Duplicate
            </MenuItem>
            <MenuItem icon={<Icon name="link" />}>Copy link</MenuItem>
            <MenuSeparator />
            <MenuCheckboxItem checked={pinned === dish.id} onCheckedChange={(on) => setPinned(on ? dish.id : "")}>
              Pin to the top
            </MenuCheckboxItem>
            <MenuSeparator />
            <MenuItem icon={<Icon name="trash" />} variant="danger">
              Remove dish
            </MenuItem>
          </ContextMenu>
        ))}
      </List>
    </div>
  );
}
