"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { CopyField } from "@registry/copy-field/copy-field";
import base from "./preview.module.css";

const FEED = "https://supperclub.example/cal/feeds/";

function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function CopyFieldPreview() {
  const [feed, setFeed] = useState(`${FEED}7f3a9c2e41b8d06e5a1f.ics`);
  const [rotating, setRotating] = useState(false);
  const [rotated, setRotated] = useState(false);

  function rotate() {
    setRotating(true);
    window.setTimeout(() => {
      setFeed(`${FEED}${token()}.ics`);
      setRotating(false);
      setRotated(true);
    }, 900);
  }

  return (
    <div className={base.stack}>
      <section className={base.form}>
        <h2 className={base.heading}>Share Saturday supper</h2>
        <CopyField
          label="RSVP link"
          mono
          value="https://supperclub.example/rsvp/saturday-supper-14-alder-lane?from=maya"
          hint="Anyone with the link can RSVP until Friday at noon."
        />
        <CopyField label="Door code" value="4471#" />
      </section>

      <section className={base.form}>
        <h2 className={base.heading}>For the guests only</h2>
        <CopyField
          label="Wi-Fi password"
          secret
          value="lemon-tart-1182"
          hint="Priya asked; it’s on the place cards too."
        />
        <CopyField
          label="Calendar feed"
          secret
          mono
          value={feed}
          hint={rotated ? "New link made. The old one stopped working." : "Adds every supper to a calendar. Rotate it if it leaks."}
          action={
            <Button variant="secondary" busy={rotating} onClick={rotate}>
              Rotate
            </Button>
          }
        />
      </section>
    </div>
  );
}
