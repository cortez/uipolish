"use client";

import {
  memo,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Alert } from "../alert/alert";
import { AnimatedSize } from "../animated-size/animated-size";
import { Avatar } from "../avatar/avatar";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { CodeBlock } from "../code-block/code-block";
import { DiffView } from "../diff-view/diff-view";
import { Icon } from "../icons/icons";
import { Kbd } from "../kbd/kbd";
import { TextField } from "../text-field/text-field";
import {
  Countdown,
  PriorityBadge,
  clock,
  money,
  noteOf,
  plural,
  priorityOf,
  requesterOf,
  toTime,
  when,
  type ApprovalField,
  type ApprovalPreview,
  type ApprovalRecipient,
  type ApprovalRequest,
  type ApprovalTool,
} from "./parts";
import styles from "./approvals-inbox.module.css";

/** What the inbox's keyboard shortcuts call on the open request. */
export type DetailHandle = {
  approve: () => void;
  decline: () => void;
  edit: () => void;
  focusTitle: () => void;
};

type DetailProps = {
  request: ApprovalRequest;
  now: number;
  canDecide: boolean;
  /** Why this person can't decide, and who can. */
  permissionNote: string;
  /** It ran out of time while open. */
  expired: boolean;
  /** A retried decision is on its way. */
  busy: "approve" | "decline" | null;
  failure: string | null;
  narrow: boolean;
  onBack: () => void;
  onApprove: (edits?: Record<string, string>) => void;
  onDecline: (note?: string) => void;
  onRequeue?: () => void;
  onDismissFailure: () => void;
  ref?: Ref<DetailHandle>;
};

function formatArguments(args: unknown) {
  if (args === undefined) return null;
  if (typeof args === "string") return args;
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

/* ---------- Previews ---------- */

const LANGUAGES: Record<string, string> = { sql: "SQL", psql: "SQL", yaml: "YAML", yml: "YAML", graphql: "GraphQL", http: "HTTP", hcl: "HCL" };

const Preview = memo(function Preview({ preview, recipientCount }: { preview: ApprovalPreview; recipientCount: number }) {
  switch (preview.kind) {
    case "email":
      return (
        <div className={styles.sheet}>
          <dl className={styles.headers}>
            <dt>From</dt>
            <dd>{preview.from}</dd>
            <dt>To</dt>
            <dd>{recipientCount > 0 ? plural(recipientCount, "person", "people") : "No one yet"}</dd>
            <dt>Subject</dt>
            <dd className={styles.subject}>{preview.subject}</dd>
          </dl>
          <p className={styles.body}>{preview.body}</p>
        </div>
      );
    case "payment": {
      const verb = preview.direction === "refund" ? "Refund to" : preview.direction === "charge" ? "Charge to" : "Pay to";
      return (
        <div className={styles.sheet}>
          <div className={styles.amountRow}>
            <p className={styles.amount}>{money(preview.amount, preview.currency)}</p>
            <p className={styles.amountMeta}>
              {verb} <strong>{preview.counterparty}</strong>
            </p>
          </div>
          {(preview.method || preview.memo) && (
            <dl className={styles.headers}>
              {preview.method && (
                <>
                  <dt>{preview.direction === "payment" ? "From" : "Card"}</dt>
                  <dd>{preview.method}</dd>
                </>
              )}
              {preview.memo && (
                <>
                  <dt>Memo</dt>
                  <dd>{preview.memo}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      );
    }
    case "post":
      return (
        <div className={styles.sheet}>
          <p className={styles.channel}>
            {preview.mark}
            <span>{preview.channel}</span>
            <span className={styles.channelAccount}>{preview.account}</span>
          </p>
          <p className={styles.body}>{preview.text}</p>
          {preview.limit !== undefined && (
            <p className={styles.limit} data-over={preview.text.length > preview.limit || undefined}>
              {preview.text.length.toLocaleString("en-US")} of {preview.limit.toLocaleString("en-US")} characters
            </p>
          )}
        </div>
      );
    case "diff":
      return <DiffView before={preview.before} after={preview.after} name={preview.name} maxHeight={320} />;
    case "delete":
      return (
        <div className={styles.sheet} data-tone="danger">
          <p className={styles.deleteWhat}>
            <Icon name="trash" />
            <span>Deletes {preview.what} for good</span>
          </p>
          {preview.items.length > 0 && (
            <ul className={styles.deleteItems}>
              {preview.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "details":
      return (
        <div className={styles.sheet}>
          <dl className={styles.details}>
            {preview.rows.map((row, i) => (
              <div key={`${row.label}-${i}`} className={styles.detailRow}>
                <dt>{row.label}</dt>
                <dd data-mono={row.mono || undefined}>
                  {row.from !== undefined ? (
                    <span className={styles.change}>
                      <span className={styles.srOnly}>Changes from </span>
                      <del className={styles.changeFrom}>{row.from}</del>
                      <span className={styles.changeNext}>
                        <Icon name="arrow-right" className={styles.changeArrow} />
                        <span className={styles.srOnly}> to </span>
                        <ins className={styles.changeTo}>{row.value}</ins>
                      </span>
                    </span>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "code": {
      const language = preview.language?.toLowerCase();
      return (
        <CodeBlock
          code={preview.code}
          language={preview.language}
          title={preview.label ?? (language ? LANGUAGES[language] : undefined)}
          maxHeight={320}
        />
      );
    }
    case "custom":
      return <div className={styles.custom}>{preview.render}</div>;
  }
});

/** The preview's heading, in the words of what it shows. */
const PREVIEW_TITLE: Record<ApprovalPreview["kind"], string> = {
  email: "Message",
  payment: "Payment",
  post: "Post",
  diff: "Changes",
  delete: "What gets deleted",
  details: "Details",
  code: "What runs",
  custom: "Details",
};

/* ---------- Recipients: the first few, the rest on demand ---------- */

const FIRST = 5;

function Recipients({ recipients }: { recipients: ApprovalRecipient[] }) {
  const listId = useId();
  const [all, setAll] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const long = recipients.length > 20;
  const shown = all
    ? recipients.filter((r) => !q || r.name.toLowerCase().includes(q) || r.detail?.toLowerCase().includes(q))
    : recipients.slice(0, FIRST);
  const more = recipients.length - FIRST;

  return (
    <div className={styles.recipients}>
      <AnimatedSize>
        {all && long && (
          <div className={styles.recipientFilter}>
            <TextField
              label="Find a recipient"
              placeholder="Name or email"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              autoComplete="off"
            />
          </div>
        )}
        <ul id={listId} className={styles.recipientList} data-all={all || undefined} tabIndex={all && long ? 0 : undefined} aria-label="Recipients">
          {shown.map((r, i) => (
            <li key={`${r.name}-${r.detail ?? i}`} className={styles.recipient}>
              <span className={styles.recipientName}>{r.name}</span>
              {r.detail && <span className={styles.recipientDetail}>{r.detail}</span>}
            </li>
          ))}
          {all && shown.length === 0 && <li className={styles.recipientNone}>No one matches “{query.trim()}”.</li>}
        </ul>
      </AnimatedSize>
      {more > 0 && (
        <button
          type="button"
          className={styles.disclosure}
          aria-expanded={all}
          aria-controls={listId}
          onClick={() => {
            setAll((a) => !a);
            setQuery("");
          }}
        >
          {all ? "Show fewer" : `Show all ${recipients.length.toLocaleString("en-US")}`}
          <Icon className={styles.chevron} name={all ? "chevron-up" : "chevron-down"} />
        </button>
      )}
    </div>
  );
}

/* ---------- Technical details: the raw call, folded away ---------- */

const TechnicalDetails = memo(function TechnicalDetails({ tool }: { tool: ApprovalTool }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const args = formatArguments(tool.arguments);
  const name = `${tool.server} · ${tool.name}`;
  return (
    <div className={styles.toolCall}>
      <button type="button" className={styles.disclosure} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        Technical details
        <Icon className={styles.chevron} name={open ? "chevron-up" : "chevron-down"} />
      </button>
      <div id={panelId} className={styles.panel} data-open={open} inert={!open}>
        <div className={styles.clip}>
          <div className={styles.panelInner}>
            {args !== null ? (
              <CodeBlock code={args} language="json" title={name} maxHeight={280} defaultWrap />
            ) : (
              <code className={styles.toolName}>{name}</code>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ---------- Edit form ---------- */

function EditForm({
  fields,
  values,
  errors,
  onChange,
  firstRef,
}: {
  fields: ApprovalField[];
  values: Record<string, string>;
  errors: Record<string, string | null>;
  onChange: (key: string, value: string) => void;
  firstRef: Ref<HTMLInputElement & HTMLTextAreaElement>;
}) {
  const id = useId();
  return (
    <div className={styles.editForm}>
      {fields.map((field, i) => {
        const ref = i === 0 ? firstRef : undefined;
        if (!field.multiline) {
          return (
            <TextField
              key={field.key}
              ref={ref}
              label={field.label}
              hint={field.hint}
              inputMode={field.inputMode}
              value={values[field.key] ?? ""}
              error={errors[field.key] ?? (field.validate ? null : undefined)}
              onChange={(e) => onChange(field.key, e.currentTarget.value)}
              autoComplete="off"
            />
          );
        }
        const fieldId = `${id}-${field.key}`;
        const error = errors[field.key];
        return (
          <div key={field.key} className={styles.area}>
            <label htmlFor={fieldId} className={styles.areaLabel}>
              {field.label}
            </label>
            <textarea
              ref={ref}
              id={fieldId}
              className={styles.textarea}
              value={values[field.key] ?? ""}
              rows={6}
              aria-invalid={error ? true : undefined}
              aria-describedby={field.hint || error ? `${fieldId}-message` : undefined}
              onChange={(e) => onChange(field.key, e.currentTarget.value)}
            />
            {(field.hint || error) && (
              <p id={`${fieldId}-message`} className={styles.areaMessage} data-error={error ? true : undefined}>
                {error ?? field.hint}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- The pane ---------- */

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHead}>
        <h3 id={id} className={styles.sectionTitle}>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** One request, in full: who asks and why, what it is, who it reaches, with the decision at the bottom. */
export function Detail({
  request,
  now,
  canDecide,
  permissionNote,
  expired,
  busy,
  failure,
  narrow,
  onBack,
  onApprove,
  onDecline,
  onRequeue,
  onDismissFailure,
  ref,
}: DetailProps) {
  const titleId = useId();
  const noteId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const firstFieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);

  const [mode, setMode] = useState<"idle" | "declining" | "editing">("idle");
  const [note, setNote] = useState("");
  const fields = request.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const pending = request.status === "pending" && !expired;
  const decidable = pending && canDecide;
  const who = requesterOf(request);
  const name = who.name;
  const priority = priorityOf(request);
  const requestNote = noteOf(request);

  const edits = Object.fromEntries(fields.filter((f) => values[f.key] !== f.value).map((f) => [f.key, values[f.key]]));
  const editCount = Object.keys(edits).length;
  const preview = request.preview;

  // A mode change moves focus into what it opened.
  const focusTarget = useRef<"note" | "field" | "decline" | "edit" | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const setFocusTarget = (target: "note" | "field" | "decline" | "edit") => {
    focusTarget.current = target;
    setFocusTick((n) => n + 1);
  };
  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const el = target === "note" ? noteRef.current : target === "field" ? firstFieldRef.current : target === "decline" ? declineRef.current : editRef.current;
    // After the panel stops being inert.
    requestAnimationFrame(() => el?.focus({ preventScroll: target === "decline" || target === "edit" }));
  }, [focusTick]);

  function approve() {
    if (!decidable || busy) return;
    if (mode === "editing") {
      const found = Object.fromEntries(fields.map((f) => [f.key, f.validate?.(values[f.key] ?? "") ?? null]));
      setErrors(found);
      if (Object.values(found).some(Boolean)) return;
      onApprove(editCount ? edits : undefined);
      return;
    }
    onApprove();
  }

  function startDecline() {
    if (!decidable || busy) return;
    setMode("declining");
    setFocusTarget("note");
  }

  function decline() {
    if (!decidable || busy) return;
    onDecline(note.trim() || undefined);
  }

  function startEdit() {
    if (!decidable || busy || fields.length === 0) return;
    setMode("editing");
    setFocusTarget("field");
  }

  function cancel() {
    const was = mode;
    setMode("idle");
    setNote("");
    if (was === "editing") {
      setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
      setErrors({});
    }
    setFocusTarget(was === "editing" ? "edit" : "decline");
  }

  useImperativeHandle(
    ref,
    () => ({
      approve,
      decline: () => (mode === "declining" ? decline() : startDecline()),
      edit: startEdit,
      focusTitle: () => titleRef.current?.focus({ preventScroll: true }),
    }),
  );

  function onNoteKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      decline();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      cancel();
    }
  }

  const requested = toTime(request.requestedAt);
  const expiresAt = request.expiresAt === undefined ? null : toTime(request.expiresAt);
  const recipients = request.recipients ?? [];
  const outcome = request.outcome;

  let footer: ReactNode;
  if (request.status === "approved" || request.status === "declined") {
    footer = (
      <div className={styles.outcome} data-status={request.status}>
        <Icon name={request.status === "approved" ? "check" : "close"} className={styles.outcomeIcon} />
        <div className={styles.outcomeText}>
          <p className={styles.outcomeLine}>
            {request.status === "approved" ? (outcome?.edited ? "Approved with edits" : "Approved") : "Declined"}
            {outcome ? ` by ${outcome.by} · ${when(toTime(outcome.at), now)}` : ""}
          </p>
          {outcome?.note && <p className={styles.outcomeNote}>Note to {name}: “{outcome.note}”</p>}
        </div>
      </div>
    );
  } else if (request.status === "expired" || expired) {
    footer = (
      <div className={styles.outcome} data-status="expired">
        <Icon name="minus" className={styles.outcomeIcon} />
        <div className={styles.outcomeText}>
          <p className={styles.outcomeLine}>
            Expired{expiresAt ? ` at ${clock(expiresAt)}` : ""} without a decision. Nothing happened.
          </p>
        </div>
        {onRequeue && canDecide && (
          <Button variant="secondary" onClick={onRequeue}>
            <Icon name="retry" />
            Reopen
          </Button>
        )}
      </div>
    );
  } else if (!canDecide) {
    footer = (
      <div className={styles.outcome} data-status="locked">
        <Icon name="info" className={styles.outcomeIcon} />
        <p className={styles.outcomeLine}>{permissionNote}</p>
      </div>
    );
  } else {
    footer = (
      <>
        <div className={styles.panel} data-open={mode === "declining"} inert={mode !== "declining"}>
          <div className={styles.clip}>
            <div className={styles.declineNote}>
              <label htmlFor={noteId} className={styles.areaLabel}>
                Tell {name} why <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                ref={noteRef}
                id={noteId}
                className={styles.textarea}
                rows={2}
                maxLength={280}
                placeholder="Not this quarter. Let’s talk about it on Monday."
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                onKeyDown={onNoteKey}
                aria-describedby={`${noteId}-hint`}
              />
              <p id={`${noteId}-hint`} className={styles.areaMessage}>
                {name} sees this with your decision.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          {mode === "idle" ? (
            <>
              <Button ref={declineRef} variant="secondary" busy={busy === "decline"} onClick={startDecline} aria-keyshortcuts="D">
                Decline
                <Kbd keys={["D"]} size="sm" className={styles.kbd} aria-hidden="true" />
              </Button>
              {fields.length > 0 && (
                <Button ref={editRef} variant="ghost" onClick={startEdit} aria-keyshortcuts="E">
                  <Icon name="pencil" />
                  Edit
                  <Kbd keys={["E"]} size="sm" className={styles.kbd} aria-hidden="true" />
                </Button>
              )}
              <span className={styles.spacer} />
              <Button busy={busy === "approve"} onClick={approve} aria-keyshortcuts="A">
                Approve
                <Kbd keys={["A"]} size="sm" className={styles.kbd} aria-hidden="true" />
              </Button>
            </>
          ) : mode === "declining" ? (
            <>
              <Button variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              <span className={styles.spacer} />
              <Button variant="secondary" busy={busy === "decline"} onClick={decline}>
                Decline
                <Kbd keys={["enter"]} size="sm" className={styles.kbd} aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={cancel}>
                Discard edits
              </Button>
              <span className={styles.editCount} aria-live="polite">
                {editCount ? `${plural(editCount, "change")}` : "No changes yet"}
              </span>
              <span className={styles.spacer} />
              <Button busy={busy === "approve"} onClick={approve}>
                {editCount ? "Approve with edits" : "Approve"}
              </Button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <article className={styles.detail} aria-labelledby={titleId} data-mode={mode}>
      <div className={styles.detailScroll}>
        {narrow && (
          <button type="button" className={styles.back} onClick={onBack}>
            <Icon name="chevron-left" />
            All requests
          </button>
        )}

        <header className={styles.detailHead}>
          <p className={styles.byline}>
            <Avatar name={name} src={who.avatarUrl} size={24} decorative />
            <strong className={styles.bylineName}>{name}</strong>
            {who.kind === "agent" && <Badge size="sm">Agent</Badge>}
            <span className={styles.bylineMeta}>
              {who.detail ? `${who.detail} · ` : ""}
              <time dateTime={new Date(requested).toISOString()} suppressHydrationWarning>
                {when(requested, now)}
              </time>
            </span>
          </p>
          <h2 ref={titleRef} id={titleId} className={styles.detailTitle} tabIndex={-1}>
            {request.title}
          </h2>
          {request.context && <p className={styles.context}>{request.context}</p>}
          {(priority || (pending && expiresAt !== null)) && (
            <div className={styles.metaRow}>
              {priority && <PriorityBadge priority={priority} />}
              {pending && expiresAt !== null && <Countdown expiresAt={expiresAt} now={now} prefix="Due in" />}
            </div>
          )}
        </header>

        {expired && request.status === "pending" && (
          <Alert tone="warning" title="This expired while you were reading it">
            It was due at {expiresAt ? clock(expiresAt) : "its deadline"}, so nothing was {request.preview?.kind === "email" ? "sent" : "done"}.
            {onRequeue ? " If it still makes sense, reopen it." : ""}
          </Alert>
        )}

        {failure && pending && (
          <Alert
            tone="error"
            title="That didn’t go through"
            onDismiss={onDismissFailure}
            actions={
              canDecide && (
                <Button variant="secondary" onClick={approve} busy={busy === "approve"}>
                  <Icon name="retry" />
                  Approve again
                </Button>
              )
            }
          >
            {failure}
          </Alert>
        )}

        {requestNote && (
          <Section title={`Note from ${name}`}>
            <p className={styles.note}>{requestNote}</p>
          </Section>
        )}

        {(preview || mode === "editing") && (
          <Section title={mode === "editing" ? "Edit before approving" : preview ? PREVIEW_TITLE[preview.kind] : "Details"}>
            {mode === "editing" ? (
              <EditForm
                fields={fields}
                values={values}
                errors={errors}
                firstRef={firstFieldRef}
                onChange={(key, value) => {
                  setValues((v) => ({ ...v, [key]: value }));
                  if (errors[key]) {
                    const field = fields.find((f) => f.key === key);
                    setErrors((e) => ({ ...e, [key]: field?.validate?.(value) ?? null }));
                  }
                }}
              />
            ) : (
              preview && <Preview preview={preview} recipientCount={recipients.length} />
            )}
          </Section>
        )}

        {recipients.length > 0 && (
          <Section title="Recipients" aside={<span className={styles.sectionCount}>{plural(recipients.length, "person", "people")}</span>}>
            <Recipients recipients={recipients} />
          </Section>
        )}

        {request.tool && <TechnicalDetails tool={request.tool} />}
      </div>

      <footer className={styles.decide}>{footer}</footer>
    </article>
  );
}
