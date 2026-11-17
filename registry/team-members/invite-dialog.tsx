"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Alert } from "../alert/alert";
import { Button } from "../button/button";
import { ChipGroup, RemovableChip } from "../chip/chip";
import { Dialog, DialogActions } from "../dialog/dialog";
import { Icon } from "../icons/icons";
import { Select, type SelectOption } from "../select/select";
import { checkEmails, plural, splitEmails, type EmailEntry } from "./emails";
import styles from "./team-members.module.css";

type InviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: string;
  /** Every role, with the ones this person can't hand out disabled. */
  roleOptions: SelectOption[];
  defaultRole: string;
  /** Null when the plan has no seat limit. */
  seatsLeft: number | null;
  /** Addresses already in the workspace or invited, lowercased. */
  taken: { members: ReadonlySet<string>; invited: ReadonlySet<string> };
  onInvite: (emails: string[], role: string) => void | Promise<unknown>;
  onUpgrade?: () => void;
  upgradeLabel: string;
  /** After the invites went out: the count, for the announcement. */
  onSent: (count: number, role: string) => void;
  triggerRef?: RefObject<HTMLElement | null>;
};

const MAX_PROBLEMS = 3;

/** "Invite people": a chip field for many addresses, a role, and the seat count. */
export function InviteDialog({
  open,
  onOpenChange,
  workspace,
  roleOptions,
  defaultRole,
  seatsLeft,
  taken,
  onInvite,
  onUpgrade,
  upgradeLabel,
  onSent,
  triggerRef,
}: InviteDialogProps) {
  const id = useId();
  const inputId = `${id}-emails`;
  const messageId = `${id}-message`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<EmailEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Each opening starts clean.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setEntries([]);
      setDraft("");
      setRole(defaultRole);
      setNote(null);
      setError(null);
      setBusy(false);
    }
  }

  const problems = entries.filter((e) => e.problem);
  const sendable = entries.length - problems.length;
  const over = seatsLeft !== null && sendable > seatsLeft ? sendable - seatsLeft : 0;

  /** Turns text into chips. Returns the entries as they'll be after the commit. */
  function commit(text: string, base = entries) {
    const parts = splitEmails(text);
    if (parts.length === 0) return base;
    const { added, duplicates } = checkEmails(parts, base, taken);
    const next = [...base, ...added];
    setEntries(next);
    setNote(duplicates ? `Skipped ${plural(duplicates, "address", "addresses")} already in the list.` : null);
    setError(null);
    return next;
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    // A separator typed at the end commits what's before it.
    const match = value.match(/^([\s\S]*)[\s,;]+$/);
    if (match) {
      commit(match[1]);
      setDraft("");
    } else {
      setDraft(value);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    // A single word pastes as normal text, so it can still be edited.
    if (!/[\s,;<]/.test(text.trim())) return;
    event.preventDefault();
    commit(`${draft} ${text}`);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && draft.trim()) {
      event.preventDefault();
      commit(draft);
      setDraft("");
    } else if (event.key === "Backspace" && draft === "" && entries.length > 0) {
      // Backspace into the last chip edits it rather than losing it.
      event.preventDefault();
      const last = entries[entries.length - 1];
      setEntries(entries.slice(0, -1));
      setDraft(last.email);
      setError(null);
    }
  }

  function remove(key: string) {
    setEntries((list) => list.filter((e) => e.key !== key));
    setError(null);
    setNote(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const list = commit(draft);
    setDraft("");
    const bad = list.filter((e) => e.problem).length;
    const good = list.length - bad;
    if (list.length === 0) {
      setError("Add at least one email address.");
      inputRef.current?.focus();
      return;
    }
    if (bad) {
      setError(`Remove the ${bad === 1 ? "address" : `${bad} addresses`} marked in red, then send.`);
      inputRef.current?.focus();
      return;
    }
    if (seatsLeft !== null && good > seatsLeft) {
      setError(
        seatsLeft === 0
          ? "There are no seats left. Upgrade, or free a seat first."
          : `Remove ${plural(good - seatsLeft, "address", "addresses")}, or upgrade for more seats.`,
      );
      return;
    }
    setError(null);
    const emails = list.map((e) => e.email);
    const result = onInvite(emails, role);
    if (result instanceof Promise) {
      setBusy(true);
      try {
        await result;
      } catch (reason) {
        setBusy(false);
        setError(
          reason instanceof Error && reason.message
            ? reason.message
            : `The invites weren’t sent. Check your connection and try again.`,
        );
        return;
      }
      setBusy(false);
    }
    onSent(emails.length, role);
    onOpenChange(false);
  }

  const problemText = problems
    .slice(0, MAX_PROBLEMS)
    .map((e) => `${e.email} ${e.problem}.`)
    .join(" ");
  const moreProblems = problems.length > MAX_PROBLEMS ? ` And ${problems.length - MAX_PROBLEMS} more.` : "";

  const sendLabel = sendable > 0 ? `Send ${plural(sendable, "invite")}` : "Send invites";
  const formId = `${id}-form`;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite people"
      description={`They’ll get an email with a link to join ${workspace}. Invites last 7 days.`}
      dirty={() => entries.length > 0 || draft.trim() !== ""}
      guard={{ title: "Discard these invites?", description: "The addresses you added won’t be sent.", discard: "Discard" }}
      locked={busy}
      initialFocus={inputRef}
      triggerRef={triggerRef}
      footer={
        <>
          <p className={styles.formError} role="alert">
            {error}
          </p>
          <DialogActions>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form={formId} busy={busy} busyLabel="Sending…">
              {sendLabel}
            </Button>
          </DialogActions>
        </>
      }
    >
      <form id={formId} className={styles.inviteForm} onSubmit={submit} noValidate>
        <div className={styles.emailField}>
          <label htmlFor={inputId} className={styles.fieldLabel}>
            Email addresses
          </label>
          <div
            className={styles.chipBox}
            data-invalid={problems.length > 0 || undefined}
            data-busy={busy || undefined}
            // Clicking the box's empty space types into the field.
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            <ChipGroup aria-label="Addresses to invite" className={styles.chips}>
              {entries.map((entry) => (
                <RemovableChip
                  key={entry.key}
                  className={entry.problem ? styles.chipBad : styles.chip}
                  removeLabel={`Remove ${entry.email}`}
                  onRemove={() => remove(entry.key)}
                >
                  {entry.problem && <Icon name="alert" className={styles.chipIcon} />}
                  {entry.email}
                  {entry.problem && <span className={styles.srOnly}>, {entry.problem}</span>}
                </RemovableChip>
              ))}
              <input
                ref={inputRef}
                id={inputId}
                className={styles.chipInput}
                value={draft}
                onChange={onChange}
                onPaste={onPaste}
                onKeyDown={onKeyDown}
                onBlur={() => {
                  if (draft.trim()) {
                    commit(draft);
                    setDraft("");
                  }
                }}
                readOnly={busy}
                type="text"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="send"
                placeholder={entries.length ? "Add more…" : "name@example.com, another@example.com"}
                aria-invalid={problems.length > 0 || undefined}
                aria-describedby={messageId}
              />
            </ChipGroup>
          </div>
          <p id={messageId} className={styles.fieldMessage} aria-live="polite">
            {problems.length > 0 ? (
              <span className={styles.fieldProblem}>
                {problemText}
                {moreProblems}
              </span>
            ) : (
              <span>
                {note ?? "Paste a list, or separate addresses with commas or spaces."}
              </span>
            )}
          </p>
        </div>

        <Select
          label="Role"
          options={roleOptions}
          value={role}
          onValueChange={setRole}
          disabled={busy}
          hint={roleOptions.find((o) => o.value === role)?.description}
        />

        {seatsLeft !== null && over === 0 && (
          <div className={styles.seatNote}>
            <SeatLine sendable={sendable} seatsLeft={seatsLeft} />
          </div>
        )}

        <Alert
          tone="warning"
          open={over > 0}
          arrive="expand"
          title={
            seatsLeft === 0
              ? "No seats left"
              : `${plural(sendable, "invite")}, ${plural(seatsLeft ?? 0, "seat")} left`
          }
          actions={
            onUpgrade && (
              <Button variant="secondary" onClick={onUpgrade}>
                {upgradeLabel}
              </Button>
            )
          }
        >
          {seatsLeft === 0
            ? "Every seat on your plan is taken. Upgrade for more, or remove someone first."
            : `Remove ${plural(over, "address", "addresses")}, or upgrade for more seats. Pending invites count as seats.`}
        </Alert>
      </form>
    </Dialog>
  );
}

function SeatLine({ sendable, seatsLeft }: { sendable: number; seatsLeft: number }) {
  const after = seatsLeft - sendable;
  if (sendable === 0) {
    return (
      <span>
        {plural(seatsLeft, "seat")} left on your plan. Pending invites count as seats.
      </span>
    );
  }
  // Over the limit, the warning below says it instead.
  return <span>{`${plural(Math.max(0, after), "seat")} left after ${sendable === 1 ? "this invite" : `these ${sendable} invites`}.`}</span>;
}
