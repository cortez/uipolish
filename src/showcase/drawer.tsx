"use client";

import { useRef, useState } from "react";
import { Drawer, DrawerActions } from "@registry/drawer/drawer";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [open, setOpen] = useState(false);
  const [plusOne, setPlusOne] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={triggerRef} variant="secondary" onClick={() => setOpen(true)}>View guest</Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        title="Priya Raman"
        description="Invited Oct 12 · Saturday supper"
        footer={
          <DrawerActions>
            <Button variant="secondary" onClick={() => setOpen(false)}>Remove guest</Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </DrawerActions>
        }
      >
        <div className={styles.stack}>
          <Checkbox label="Bringing a plus-one" checked={plusOne} onCheckedChange={setPlusOne} />
          <Checkbox label="Vegetarian" defaultChecked />
        </div>
      </Drawer>
    </>
  );
}
