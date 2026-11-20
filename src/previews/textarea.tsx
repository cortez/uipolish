"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { TextField } from "@registry/text-field/text-field";
import { Textarea } from "@registry/textarea/textarea";
import styles from "./preview.module.css";

const TEMPLATE =
  "Doors open at 7:00 and we sit down at 7:30.\n\nStreet parking is free after 6:00; the side gate will be unlocked.\n\nTell me about any allergies by Wednesday so I can plan the menu around them.";

const RUN_OF_SHOW =
  "5:30  Short ribs out of the oven to rest\n6:00  Set the table, light the candles\n6:30  Bread in to warm, open the red\n7:00  Doors. Sparkling water and olives on the counter\n7:30  Sit down. Burrata with charred peaches\n8:15  Short ribs, polenta, gremolata\n9:00  Olive oil cake, coffee for whoever wants it\n9:45  Last pour\n10:30 Cars for Theo and Priya";

export function TextareaPreview() {
  const [note, setNote] = useState("");

  return (
    <div className={styles.stack}>
      <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={styles.heading}>Write the invitation</h2>
        <TextField label="Subject" defaultValue="Friday supper at Maya’s" hint="Shown in the inbox." />
        <Textarea
          label="Message"
          placeholder="What should guests know before they come?"
          hint="Sent with the invitation. It grows as you write."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          validate={(v) => (v.trim() ? null : "Write a line or two for your guests")}
        />
        <div className={styles.row}>
          <Button variant="secondary" size="sm" onClick={() => setNote(TEMPLATE)}>
            Use last month’s note
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setNote("")}>
            Clear
          </Button>
        </div>
      </form>

      <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={styles.heading}>Counts, limits and errors</h2>
        <Textarea
          label="Text reminder"
          minRows={2}
          limit={160}
          defaultValue="Supper is this Friday at 7:00. Reply with any allergies by Wednesday, and bring a jacket: we’ll have dessert in the garden."
          hint="One text message holds 160 characters."
        />
        <Textarea
          label="Toast"
          minRows={2}
          maxLength={80}
          count
          defaultValue="To old friends, new neighbors and second helpings."
          hint="Printed on the place cards; it stops at 80."
        />
        <Textarea
          label="Allergy notes"
          minRows={2}
          defaultValue="Sam: shellfish"
          error="Add what Priya’s plus one can’t eat before you send the menu"
        />
        <Textarea label="Kitchen notes" minRows={2} defaultValue="Locked once the menu is sent to the caterer." disabled hint="Unlock the menu to edit." />
      </form>

      <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={styles.heading}>Long text scrolls</h2>
        <Textarea
          label="Run of show"
          minRows={3}
          maxRows={6}
          defaultValue={RUN_OF_SHOW}
          hint="Six rows, then it scrolls and the edges fade."
        />
        <Textarea label="Note to the host" size="lg" minRows={1} placeholder="One line is enough" hint="Large, starting at one row: the size of a large text field." />
      </form>
    </div>
  );
}
