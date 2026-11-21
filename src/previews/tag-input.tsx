"use client";

import { useState } from "react";
import { TagInput, type TagSuggestion } from "@registry/tag-input/tag-input";
import { Button } from "@registry/button/button";
import base from "./preview.module.css";

const CONTACTS: TagSuggestion[] = [
  { value: "maya.chen@example.com", label: "Maya Chen", description: "maya.chen@example.com" },
  { value: "priya.patel@example.com", label: "Priya Patel", description: "priya.patel@example.com" },
  { value: "tomas.ortega@example.org", label: "Tomás Ortega", description: "tomas.ortega@example.org" },
  { value: "ines.laurent@example.com", label: "Inès Laurent", description: "ines.laurent@example.com" },
  { value: "sam.okafor@example.com", label: "Sam Okafor", description: "sam.okafor@example.com" },
  { value: "noor.haddad@example.org", label: "Noor Haddad", description: "noor.haddad@example.org" },
  { value: "kenji.tanaka@example.com", label: "Kenji Tanaka", description: "kenji.tanaka@example.com" },
  { value: "lena.novak@example.com", label: "Lena Novak", description: "lena.novak@example.com" },
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const NOTES = ["Window table", "Birthday", "Nut allergy"];

export function TagInputPreview() {
  const [guests, setGuests] = useState<string[]>(["maya.chen@example.com", "priya.patel@example.com"]);
  const [sent, setSent] = useState<string | null>(null);

  return (
    <div className={base.stack}>
      <form
        className={base.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSent(`Invitations sent to ${guests.length} ${guests.length === 1 ? "guest" : "guests"}.`);
        }}
      >
        <h2 className={base.heading}>Invite to Friday supper</h2>
        <TagInput
          label="Guests"
          name="guests"
          placeholder="Name or email"
          suggestions={CONTACTS}
          value={guests}
          onValueChange={(next) => {
            setGuests(next);
            setSent(null);
          }}
          max={12}
          validate={(v) => (isEmail(v) ? null : `Use a full email for “${v}”, like name@example.com`)}
          hint="Type a name, or paste a list of emails."
        />
        <div className={base.row}>
          <Button type="submit" disabled={guests.length === 0}>
            Send invitations
          </Button>
          <Button variant="ghost" onClick={() => setGuests([])}>
            Clear all
          </Button>
        </div>
        <p className={base.note} role="status">
          {sent}
        </p>
      </form>

      <section className={base.form}>
        <TagInput
          label="Notes for the kitchen"
          defaultValue={NOTES}
          placeholder="Add a note"
          hint="Press Enter or a comma after each note."
        />
        <TagInput
          label="Table labels"
          size="lg"
          defaultValue={["Garden room", "Long table", "Tables 4 and 5, pushed together by the window so the party of nine sits as one"]}
          hint="Long labels wrap onto their own lines."
        />
        <TagInput
          label="Co-hosts"
          defaultValue={["dana@example.com"]}
          error="Dana hasn’t accepted the co-host invitation yet"
        />
        <TagInput label="Event tags" defaultValue={["Supper club", "October"]} disabled hint="Set by the venue." />
      </section>
    </div>
  );
}
