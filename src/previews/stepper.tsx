"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Dialog, DialogActions } from "@registry/dialog/dialog";
import { TextField } from "@registry/text-field/text-field";
import { Stepper, type StepperStep } from "@registry/stepper/stepper";
import styles from "./preview.module.css";
import own from "./stepper.module.css";

/* ---------- Booking a private dinner: horizontal, with going back ---------- */

const BOOKING: StepperStep[] = [
  { id: "menu", title: "Menu", description: "Six courses, two swaps" },
  { id: "guests", title: "Guests", description: "12 seats, 3 allergies" },
  { id: "venue", title: "Date and venue", description: "Sat, Nov 8 · 14 Alder Lane" },
  { id: "pay", title: "Deposit", description: "$240 of $960" },
];

const PANES = [
  "Pick six courses from the autumn menu. Swaps for two dishes are free.",
  "Twelve seats are held. Amara, Theo and Priya listed allergies.",
  "Saturday, November 8 at 14 Alder Lane, with the kitchen from 3 pm.",
  "A $240 deposit holds the night. The rest is due a week before.",
];

function Booking() {
  const [current, setCurrent] = useState(1);
  const [declined, setDeclined] = useState(false);
  const [tried, setTried] = useState(false);
  const total = BOOKING.length;
  const failed = declined && tried && current === total - 1;
  const steps = BOOKING.map((s, i) =>
    i === total - 1 && failed ? { ...s, status: "error" as const, description: "Card ending 4242 was declined" } : s,
  );

  function next() {
    if (current === total - 1 && declined) {
      setTried(true);
      return;
    }
    setTried(false);
    setCurrent((c) => Math.min(total, c + 1));
  }

  function back() {
    setTried(false);
    setCurrent((c) => Math.max(0, c - 1));
  }

  return (
    <div className={styles.group}>
      <span className={styles.label}>Book a private dinner: finished steps go back</span>
      <div className={own.card}>
        <Stepper
          steps={steps}
          current={current}
          onStepClick={(i) => {
            setTried(false);
            setCurrent(i);
          }}
          label="Booking steps"
        />
        <p className={own.body}>
          {current === total
            ? "Booked. The chef will call you on Monday to confirm."
            : failed
              ? "The bank declined the card ending 4242. Try another card."
              : PANES[current]}
        </p>
        <div className={own.actions}>
          <Checkbox
            label="Decline the card"
            checked={declined}
            onCheckedChange={(on) => {
              setDeclined(on);
              if (!on) setTried(false);
            }}
          />
          <div className={own.buttons}>
            <Button variant="secondary" onClick={back} disabled={current === 0}>
              Back
            </Button>
            <Button onClick={next} disabled={current === total}>
              {current === total - 1 ? "Pay deposit" : current === total ? "Booked" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- An agent's plan: vertical, with skipped and failed steps ---------- */

const PLAN: StepperStep[] = [
  { id: "read", title: "Read the guest list", description: "guests.csv, 12 people" },
  { id: "allergies", title: "Check allergies", description: "Nuts for Amara, shellfish for Theo" },
  { id: "wine", title: "Pair wines with each course", description: "Optional; you said you’d bring your own" },
  { id: "menu", title: "Draft the menu", description: "Six courses around the lamb shoulder" },
  { id: "order", title: "Order groceries from market.example.com", description: "Delivery Friday before 6 pm" },
  { id: "timeline", title: "Send everyone the timeline for Saturday" },
];
const SKIPPED = 2;
const ORDER = 4;

function Plan() {
  const [current, setCurrent] = useState(3);
  const [failed, setFailed] = useState(false);
  const steps = PLAN.map((s, i) => {
    if (i === SKIPPED) return { ...s, status: "skipped" as const };
    if (i === ORDER && failed && current === ORDER)
      return { ...s, status: "error" as const, description: "market.example.com didn’t respond. Try again or order by phone." };
    return s;
  });

  return (
    <div className={styles.group}>
      <span className={styles.label}>An agent’s plan, with a skipped step</span>
      <div className={own.plan}>
        <Stepper steps={steps} current={current} orientation="vertical" label="Plan for Saturday supper" />
      </div>
      <div className={styles.row}>
        <Button
          variant="secondary"
          onClick={() => setCurrent((c) => Math.max(0, c - 1 === SKIPPED ? c - 2 : c - 1))}
          disabled={current === 0}
        >
          Step back
        </Button>
        <Button
          variant="secondary"
          onClick={() => setCurrent((c) => Math.min(PLAN.length, c + 1 === SKIPPED ? c + 2 : c + 1))}
          disabled={current === PLAN.length}
        >
          Advance
        </Button>
        <Checkbox label="The order fails" checked={failed} onCheckedChange={setFailed} />
      </div>
    </div>
  );
}

/* ---------- Inside a dialog's steps: compact, in the footer ---------- */

const HOST: StepperStep[] = [
  { id: "when", title: "When and where" },
  { id: "who", title: "Who’s coming" },
  { id: "send", title: "Send invitations" },
];

function HostDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [night, setNight] = useState("");
  const [guests, setGuests] = useState("Amara, Theo and Priya");
  const [error, setError] = useState<string | undefined>();

  function next(event?: FormEvent) {
    event?.preventDefault();
    if (step === 0 && !night.trim()) {
      setError("Pick a night, like Friday, Nov 7");
      return;
    }
    if (step < HOST.length - 1) setStep(step + 1);
    else setOpen(false);
  }

  return (
    <div className={styles.group}>
      <span className={styles.label}>In a dialog with steps, in place of “Step 1 of 3”</span>
      <div className={styles.row}>
        <Button
          variant="secondary"
          onClick={() => {
            setStep(0);
            setError(undefined);
            setOpen(true);
          }}
        >
          Host a dinner
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Host a dinner"
        description="Guests RSVP from the link."
        step={step}
        footer={
          <>
            {/* The dots go back to a finished step. */}
            <Stepper
              className={own.footerSteps}
              steps={HOST}
              current={step}
              variant="compact"
              onStepClick={setStep}
              label="Dinner steps"
            />
            <DialogActions>
              <Button variant="secondary" onClick={() => (step === 0 ? setOpen(false) : setStep(step - 1))}>
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              <Button onClick={() => next()}>{step === HOST.length - 1 ? "Send invitations" : "Next"}</Button>
            </DialogActions>
          </>
        }
      >
        {(s) =>
          s === 0 ? (
            <form className={own.form} onSubmit={next} noValidate>
              <p className={own.stepTitle}>When and where</p>
              <TextField
                label="Night"
                placeholder="Friday, Nov 7"
                value={night}
                onChange={(e) => {
                  setNight(e.target.value);
                  setError(undefined);
                }}
                error={error}
              />
            </form>
          ) : s === 1 ? (
            <form className={own.form} onSubmit={next}>
              <p className={own.stepTitle}>Who’s coming</p>
              <TextField label="Guests" value={guests} onChange={(e) => setGuests(e.target.value)} />
            </form>
          ) : (
            <div className={own.form}>
              <p className={own.stepTitle}>Send invitations</p>
              <p className={own.body}>
                {guests || "No one yet"} get a link to example.com/d/supper for {night || "the night"}.
              </p>
            </div>
          )
        }
      </Dialog>
    </div>
  );
}

/* ---------- Long titles and narrow places ---------- */

const LONG: StepperStep[] = [
  { id: "a", title: "Confirm the head count with the venue" },
  { id: "b", title: "Agree on a menu with the chef and the sommelier" },
  { id: "c", title: "Pay the deposit" },
];

export function StepperPreview() {
  return (
    <div className={styles.stack}>
      <Booking />
      <Plan />
      <HostDialog />
      <div className={styles.group}>
        <span className={styles.label}>Long titles wrap in their column</span>
        <div className={own.long}>
          <Stepper steps={LONG} current={1} variant="full" label="Event steps" />
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>Under 128px a step, the row turns into dots and a count</span>
        <div className={own.narrow}>
          <Stepper steps={BOOKING} current={2} label="Booking steps, narrow" />
        </div>
      </div>
    </div>
  );
}
