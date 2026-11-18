"use client";

import { useRef, useState } from "react";
import { Dialog, DialogActions } from "@registry/dialog/dialog";
import { Button } from "@registry/button/button";
import { TextField } from "@registry/text-field/text-field";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>Host a dinner</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        title="Host a dinner"
        description="Guests RSVP from the link."
        footer={
          <DialogActions>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Create dinner</Button>
          </DialogActions>
        }
      >
        <div className={styles.stack}>
          <TextField label="Name" defaultValue="Saturday supper" />
          <TextField label="Where" placeholder="14 Alder Lane" />
        </div>
      </Dialog>
    </>
  );
}
