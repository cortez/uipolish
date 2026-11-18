"use client";

import { useState, type FormEvent } from "react";
import { Avatar } from "@registry/avatar/avatar";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { Switch } from "@registry/switch/switch";
import { TextField } from "@registry/text-field/text-field";
import { ConfirmDialog, Dialog, DialogActions } from "@registry/dialog/dialog";
import styles from "./dialog.module.css";

type Draft = {
  date: string;
  place: string;
  guests: string[];
  allergies: boolean;
  note: string;
};

const EMPTY: Draft = { date: "", place: "", guests: ["Amara Okafor", "Theo Lindqvist", "Priya Raman"], allergies: false, note: "" };
const STEPS = 3;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function DialogPreview() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<{ date?: string; place?: string }>({});
  const [newGuest, setNewGuest] = useState("");
  const [sending, setSending] = useState(false);
  const [planned, setPlanned] = useState<Draft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failNext, setFailNext] = useState(true);
  const [status, setStatus] = useState("");

  const dirty = draft.date !== "" || draft.place !== "" || draft.note !== "" || draft.guests.length !== EMPTY.guests.length;

  function begin() {
    setDraft(EMPTY);
    setErrors({});
    setNewGuest("");
    setStep(1);
    setOpen(true);
  }

  async function next() {
    if (step === 1) {
      const found = {
        date: draft.date.trim() ? undefined : "Pick a night, like Friday, Nov 7",
        place: draft.place.trim() ? undefined : "Add an address so guests can find it",
      };
      setErrors(found);
      if (found.date || found.place) return;
    }
    if (step < STEPS) {
      setStep(step + 1);
      return;
    }
    setSending(true);
    await wait(800);
    setSending(false);
    setPlanned(draft);
    setOpen(false);
    setStatus(`Invitations sent to ${draft.guests.length} guests`);
  }

  function back() {
    if (step === 1) setOpen(false);
    else setStep(step - 1);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    next();
  }

  function addGuest(event: FormEvent) {
    event.preventDefault();
    const name = newGuest.trim();
    if (!name) return;
    setDraft({ ...draft, guests: [...draft.guests, name] });
    setNewGuest("");
  }

  async function cancelDinner() {
    await wait(900);
    // The first attempt fails so the error state is visible; the retry works.
    if (failNext) {
      setFailNext(false);
      throw new Error("Guests couldn’t be told. Check your connection and try again.");
    }
    setPlanned(null);
    setFailNext(true);
    setStatus("Dinner canceled. Guests were told.");
  }

  function renderStep(s: number | string) {
    if (s === 1)
      return (
        <form
          className={styles.form}
          onSubmit={submit}
          // Two fields and no submit button inside: browsers skip implicit
          // submission, so Enter in either field moves on here.
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLInputElement && !e.nativeEvent.isComposing) submit(e);
          }}
          noValidate
        >
          <p className={styles.stepTitle}>When and where</p>
          <TextField
            label="Night"
            placeholder="Friday, Nov 7"
            value={draft.date}
            onChange={(e) => {
              setDraft({ ...draft, date: e.target.value });
              if (errors.date) setErrors({ ...errors, date: undefined });
            }}
            error={errors.date}
          />
          <TextField
            label="Address"
            placeholder="14 Alder Lane"
            value={draft.place}
            onChange={(e) => {
              setDraft({ ...draft, place: e.target.value });
              if (errors.place) setErrors({ ...errors, place: undefined });
            }}
            error={errors.place}
          />
        </form>
      );

    if (s === 2)
      return (
        <div className={styles.form}>
          <p className={styles.stepTitle}>Who’s coming</p>
          <ul className={styles.guests}>
            {draft.guests.map((g) => (
              <li key={g} className={styles.guest}>
                <Avatar name={g} size={32} decorative />
                <span className={styles.guestName}>{g}</span>
                <Button
                  variant="ghost"
                  className={styles.remove}
                  aria-label={`Remove ${g}`}
                  onClick={() => setDraft({ ...draft, guests: draft.guests.filter((x) => x !== g) })}
                >
                  <Icon name="close" />
                </Button>
              </li>
            ))}
          </ul>
          <form onSubmit={addGuest}>
            <TextField
              label="Add a guest"
              placeholder="Name"
              hint="Press Enter to add them to the list."
              enterKeyHint="done"
              value={newGuest}
              onChange={(e) => setNewGuest(e.target.value)}
            />
          </form>
          <Switch
            label="Ask about allergies"
            description="Adds a line to the invitation."
            checked={draft.allergies}
            onChange={(e) => setDraft({ ...draft, allergies: e.target.checked })}
          />
          {draft.allergies && (
            <div className={styles.reveal}>
              <TextField
                label="Line on the invitation"
                placeholder="Tell me about allergies by Wednesday"
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>
          )}
        </div>
      );

    return (
      <div className={styles.form}>
        <p className={styles.stepTitle}>Send invitations</p>
        <dl className={styles.summary}>
          <div>
            <dt>When</dt>
            <dd>{draft.date || "—"}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{draft.place || "—"}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{draft.guests.length ? draft.guests.join(", ") : "No one yet"}</dd>
          </div>
        </dl>
        <p className={styles.note}>Each guest gets a link to example.com/d/supper to RSVP.</p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-labelledby="dinner-title">
        <header className={styles.cardHeader}>
          <div>
            <h2 id="dinner-title" className={styles.cardTitle}>
              {planned ? `Supper, ${planned.date}` : "Book club supper"}
            </h2>
            <p className={styles.meta}>
              {planned ? `${planned.place} · ${planned.guests.length} invited` : "Nothing planned yet"}
            </p>
          </div>
          {planned ? (
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              Cancel dinner
            </Button>
          ) : (
            <Button onClick={begin}>
              Host a dinner
            </Button>
          )}
        </header>
      </section>

      <p className={styles.note}>
        Host a dinner: the dialog eases to each step’s size, and to the errors if you press Next with nothing
        filled in. Once planned, the first cancel fails on purpose to show the error.
      </p>
      <span role="status" className={styles.srOnly}>
        {status}
      </span>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Host a dinner"
        description="Guests RSVP from the link."
        step={step}
        dirty={dirty && !sending}
        locked={sending}
        footer={
          <>
            <p className={styles.count} aria-live="polite">
              Step {step} of {STEPS}
            </p>
            <DialogActions>
              <Button variant="secondary" onClick={back} disabled={sending}>
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              <Button onClick={next} busy={sending}>
                {step === STEPS ? "Send invitations" : "Next"}
              </Button>
            </DialogActions>
          </>
        }
      >
        {renderStep}
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Cancel supper on ${planned?.date ?? "Friday"}?`}
        description={`${planned?.guests.length ?? 0} guests get a note that it’s off. Their RSVPs are cleared.`}
        confirmLabel="Cancel dinner"
        cancelLabel="Keep dinner"
        onConfirm={cancelDinner}
      />
    </div>
  );
}
