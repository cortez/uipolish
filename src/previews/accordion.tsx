"use client";

import { useState } from "react";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { Switch } from "@registry/switch/switch";
import base from "./preview.module.css";
import styles from "./accordion.module.css";

const REMINDERS = [
  { id: "week", label: "A week before" },
  { id: "day", label: "The day before" },
  { id: "hour", label: "An hour before" },
] as const;

export function AccordionPreview() {
  const [reminders, setReminders] = useState<Record<string, boolean>>({ week: true, day: true, hour: false });
  const on = Object.values(reminders).filter(Boolean).length;

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Billing questions</h2>
        <Accordion hash defaultValue="charged">
          <AccordionItem value="charged" title="When will I be charged?">
            <p>
              On the day you subscribe, then on the same date each month or year. If that date doesn’t exist in a
              month, such as the 31st, you’re charged on the last day of that month.
            </p>
          </AccordionItem>
          <AccordionItem value="change-plan" title="Can I change plans in the middle of a billing period?">
            <p>
              Yes. Moving up takes effect at once and you pay the difference for the days left. Moving down takes
              effect at the next renewal, so you keep what you paid for until then.
            </p>
          </AccordionItem>
          <AccordionItem value="refunds" title="How do refunds work?">
            <p>
              Yearly plans can be refunded in full within 14 days of a charge. Write to billing@example.com from the
              account’s email and the refund reaches your card in 5 to 10 business days.
            </p>
          </AccordionItem>
          <AccordionItem value="household" title="Can my household share one plan?">
            <p>
              On the Household plan, up to six people share one bill. Invite them under Billing, then Members, and
              each person keeps their own sign-in.
            </p>
          </AccordionItem>
        </Accordion>
        <p className={base.note}>
          Each question links to itself: <a className={styles.link} href="#refunds">#refunds</a> opens the third one.
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>With a value on each row</h2>
        <Accordion type="multiple" defaultValue={["reminders"]}>
          <AccordionItem value="reminders" title="Reminders" meta={on === 0 ? "Off" : `${on} on`}>
            <div className={styles.settings}>
              {REMINDERS.map((r) => (
                <Switch
                  key={r.id}
                  side="end"
                  label={r.label}
                  checked={reminders[r.id]}
                  onChange={(e) => setReminders((s) => ({ ...s, [r.id]: e.target.checked }))}
                />
              ))}
            </div>
          </AccordionItem>
          <AccordionItem value="dietary" title="Dietary notes" meta="3 guests">
            <p>Priya is vegetarian, Sam avoids gluten, and Dana can’t have tree nuts. Maya plans the menu around all three.</p>
          </AccordionItem>
          <AccordionItem value="plus-ones" title="Plus-ones" meta="Not set">
            <p>Choose whether guests can bring someone. Until you do, the invitation doesn’t mention it.</p>
          </AccordionItem>
          <AccordionItem
            value="message"
            title="Message on the invitation, shown under the date and the address"
            meta="“Bring a jumper, we eat outside”"
          >
            <p>Bring a jumper, we eat outside. A long value fades out at its cut before the title gives up its line.</p>
          </AccordionItem>
        </Accordion>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Several open at once</h2>
        <Accordion type="multiple" defaultValue={["sender"]}>
          <AccordionItem value="sender" title="Host details">
            <p>Maya Chen, 14 Alder Lane, Portland, OR 97214. Shown at the top of every invitation.</p>
          </AccordionItem>
          <AccordionItem value="numbering" title="Reply deadline">
            <p>Guests can RSVP until 48 hours before the dinner. After that, the host confirms any changes.</p>
          </AccordionItem>
          <AccordionItem value="footer" title="Footer note">
            <p>Street parking on Alder Lane. The side gate opens at 7 p.m.</p>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
