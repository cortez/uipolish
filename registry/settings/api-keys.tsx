"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { Alert } from "../alert/alert";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { ConfirmDialog, Dialog, DialogActions } from "../dialog/dialog";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { CopyField } from "../copy-field/copy-field";
import { Select } from "../select/select";
import { TextField } from "../text-field/text-field";
import { SectionHead } from "./parts";
import { DAY, ago, dateLabel, keyFlag, masked, message, toTime, type ApiKey, type ApiKeyScope, type NewApiKey } from "./shared";
import styles from "./settings.module.css";

const EXPIRY = [
  { value: "30", label: "In 30 days" },
  { value: "90", label: "In 90 days" },
  { value: "365", label: "In a year" },
  { value: "never", label: "Never" },
];

export type ApiKeysProps = {
  headingId: string;
  product: string;
  workspace: string;
  keys: ApiKey[];
  scopes: ApiKeyScope[];
  now: number;
  staleDays: number;
  readOnly: boolean;
  onCreate?: (input: NewApiKey) => Promise<{ key: ApiKey; secret: string }>;
  onRevoke?: (id: string) => Promise<unknown>;
  announce: (text: string) => void;
};

export function ApiKeys({
  headingId,
  product,
  workspace,
  keys,
  scopes,
  now,
  staleDays,
  readOnly,
  onCreate,
  onRevoke,
  announce,
}: ApiKeysProps) {
  const id = useId();
  const createButton = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const revokeTrigger = useRef<HTMLElement | null>(null);
  const revokeFinal = useRef<HTMLElement | null>(null);

  const canCreate = !readOnly && Boolean(onCreate);
  const canRevoke = !readOnly && Boolean(onRevoke);
  const flagged = keys.filter((k) => keyFlag(k, now, staleDays));
  const labelOf = (scope: string) => scopes.find((s) => s.value === scope)?.label ?? scope;

  async function revoke() {
    if (!revoking || !onRevoke) return;
    const index = keys.findIndex((k) => k.id === revoking.id);
    await onRevoke(revoking.id);
    // Focus moves to the next key's Revoke, the one before, or Create key.
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-revoke]") ?? []);
    revokeFinal.current = buttons[index + 1] ?? buttons[index - 1] ?? createButton.current;
    announce(`${revoking.name} revoked. Requests with ${masked(revoking)} now fail.`);
  }

  const create = canCreate && (
    <Button ref={createButton} onClick={() => setCreating(true)}>
      <Icon name="plus" />
      Create key
    </Button>
  );

  return (
    <>
      <SectionHead
        id={headingId}
        title="API keys"
        intro={`Keys let your own code call the ${product} API as ${workspace}. Anyone with a key can use it, so keep keys out of code you share.`}
        action={keys.length > 0 ? create : undefined}
      />

      {flagged.length > 0 && canRevoke && (
        <p className={styles.flagNote}>
          <Icon name="warning" className={styles.flagIcon} />
          <span>
            {flagged.length === 1 ? "1 key is" : `${flagged.length} keys are`} expired or unused for {staleDays} days. Revoke what nothing
            needs any more.
          </span>
        </p>
      )}

      {keys.length === 0 ? (
        <div className={styles.box} data-empty="">
          <EmptyState
            art="box"
            title="No API keys yet"
            description={
              canCreate
                ? `Create a key to call the ${product} API from your own code, a script or a CI job.`
                : `When an admin creates a key for ${workspace}, it shows up here.`
            }
            action={create}
          />
        </div>
      ) : (
        <ul ref={listRef} className={`${styles.box} ${styles.keys}`} aria-labelledby={headingId}>
          {keys.map((key) => {
            const flag = keyFlag(key, now, staleDays);
            const lastUsed = key.lastUsedAt === null ? "Never used" : `Last used ${ago(toTime(key.lastUsedAt), now)}`;
            const expires =
              key.expiresAt == null
                ? "No expiry"
                : flag === "expired"
                  ? `Expired ${dateLabel(toTime(key.expiresAt), now)}`
                  : `Expires ${dateLabel(toTime(key.expiresAt), now)}`;
            return (
              <li key={key.id} className={styles.key} data-flag={flag ?? undefined}>
                <div className={styles.keyMain}>
                  <p className={styles.keyLine}>
                    <span className={styles.keyName}>{key.name}</span>
                    <code className={styles.keySecret}>{masked(key)}</code>
                    {flag === "expired" && (
                      <Badge size="sm" tone="warning">
                        Expired
                      </Badge>
                    )}
                    {flag === "stale" && (
                      <Badge size="sm" tone="warning">
                        Unused {staleDays}+ days
                      </Badge>
                    )}
                  </p>
                  <p className={styles.keyMeta}>
                    Created {dateLabel(toTime(key.createdAt), now)} by {key.createdBy}
                  </p>
                  <p className={styles.keyMeta}>
                    <span data-tone={flag === "stale" ? "warning" : undefined}>{lastUsed}</span>
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                    <span className={styles.srOnly}>, </span>
                    <span data-tone={flag === "expired" ? "warning" : undefined}>{expires}</span>
                  </p>
                  <ul className={styles.scopes} aria-label={`Scopes of ${key.name}`}>
                    {key.scopes.map((s) => (
                      <li key={s}>
                        <Badge size="sm">{labelOf(s)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
                {canRevoke && (
                  <Button
                    variant="secondary"
                    data-revoke=""
                    aria-label={`Revoke ${key.name}`}
                    className={styles.keyAction}
                    onClick={(e) => {
                      revokeTrigger.current = e.currentTarget;
                      revokeFinal.current = null;
                      setRevoking(key);
                      setRevokeOpen(true);
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canCreate && onCreate && (
        <CreateKeyDialog
          open={creating}
          onOpenChange={setCreating}
          scopes={scopes}
          taken={keys.map((k) => k.name.toLowerCase())}
          now={now}
          onCreate={onCreate}
          triggerRef={createButton}
          labelId={`${id}-create`}
          onCreated={(key) => announce(`${key.name} created. Copy the key now; it won’t be shown again.`)}
        />
      )}

      {revoking && (
        <ConfirmDialog
          open={revokeOpen}
          onOpenChange={setRevokeOpen}
          triggerRef={revokeTrigger}
          finalFocus={revokeFinal}
          title={`Revoke ${revoking.name}?`}
          description={`Requests that use ${masked(revoking)} start failing straight away. Anything still using it needs a new key. This can’t be undone.`}
          confirmLabel="Revoke key"
          onConfirm={revoke}
        />
      )}
    </>
  );
}

/* ---------- Create key ---------- */

type CreateKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopes: ApiKeyScope[];
  taken: string[];
  now: number;
  onCreate: (input: NewApiKey) => Promise<{ key: ApiKey; secret: string }>;
  onCreated: (key: ApiKey) => void;
  triggerRef: RefObject<HTMLElement | null>;
  labelId: string;
};

function CreateKeyDialog({ open, onOpenChange, scopes, taken, now, onCreate, onCreated, triggerRef, labelId }: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(() => (scopes[0] ? [scopes[0].value] : []));
  const [expiry, setExpiry] = useState("90");
  const [attempted, setAttempted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ key: ApiKey; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Each opening starts on a clean form.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName("");
      setPicked(scopes[0] ? [scopes[0].value] : []);
      setExpiry("90");
      setAttempted(false);
      setNameTouched(false);
      setError(null);
      setCreated(null);
      setCopied(false);
    }
  }
  const firstScope = useRef<HTMLInputElement>(null);

  const trimmed = name.trim();
  const nameError = !trimmed
    ? "Give the key a name, like where it runs"
    : taken.includes(trimmed.toLowerCase())
      ? `There’s already a key called ${trimmed}`
      : null;
  const scopeError = picked.length === 0 ? "Pick at least one scope" : null;
  const days = expiry === "never" ? null : Number(expiry);

  async function submit() {
    if (busy) return;
    setAttempted(true);
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    if (scopeError) {
      firstScope.current?.parentElement?.querySelector<HTMLElement>("button")?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onCreate({ name: trimmed, scopes: picked, expiresInDays: days });
      setCreated(result);
      onCreated(result.key);
    } catch (reason) {
      setError(message(reason, "Couldn’t create the key. Nothing was created; try again."));
    } finally {
      setBusy(false);
    }
  }

  const step = created ? "secret" : "form";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={created ? `Copy ${created.key.name}` : "Create API key"}
      description={created ? undefined : "The key can do what its scopes allow, as this workspace."}
      triggerRef={triggerRef}
      locked={busy}
      step={step}
      dirty={() => (created ? !copied : Boolean(trimmed))}
      guard={
        created
          ? {
              title: "Close without copying the key?",
              description: "You won’t be able to see it again. You’d need to revoke it and create another.",
              keep: "Go back",
              discard: "Close anyway",
            }
          : undefined
      }
      footer={
        created ? (
          <DialogActions>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogActions>
        ) : (
          <>
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
            <DialogActions>
              <Button variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button busy={busy} busyLabel="Creating…" onClick={submit}>
                Create key
              </Button>
            </DialogActions>
          </>
        )
      }
    >
      {(s) =>
        s === "secret" && created ? (
          <div className={styles.dialogBody}>
            <Alert tone="warning" title="You won’t see this key again">
              Copy it now and store it somewhere safe, like your secrets manager. If you lose it, revoke it and create a new one.
            </Alert>
            <CopyField
              label="Secret key"
              value={created.secret}
              mono
              onCopied={() => setCopied(true)}
              hint={copied ? "Copied. Paste it where your code reads its secrets." : `Starts with sk-, ends in ${created.key.last4}.`}
            />
          </div>
        ) : (
          <form
            className={styles.dialogBody}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField
              ref={nameRef}
              label="Name"
              value={name}
              placeholder="Support inbox bot"
              autoComplete="off"
              hint="Where the key runs, so you can tell keys apart later."
              error={(attempted || nameTouched) && nameError ? nameError : null}
              onChange={(e) => setName(e.currentTarget.value)}
              onBlur={() => setNameTouched(true)}
            />
            <fieldset className={styles.scopeSet} aria-describedby={`${labelId}-scopes`}>
              <legend className={styles.legend}>Scopes</legend>
              <div className={styles.scopeList}>
                {scopes.map((scope, i) => (
                  <Checkbox
                    key={scope.value}
                    ref={i === 0 ? firstScope : undefined}
                    label={scope.label}
                    description={scope.description}
                    checked={picked.includes(scope.value)}
                    onCheckedChange={(on) => setPicked((p) => (on ? [...p, scope.value] : p.filter((v) => v !== scope.value)))}
                  />
                ))}
              </div>
              <p
                id={`${labelId}-scopes`}
                className={styles.fieldNote}
                data-tone={attempted && scopeError ? "danger" : undefined}
                aria-live="polite"
              >
                {attempted && scopeError ? scopeError : "Give it only what it needs. You can’t change scopes later."}
              </p>
            </fieldset>
            <Select
              label="Expires"
              options={EXPIRY}
              value={expiry}
              onValueChange={setExpiry}
              hint={
                days === null
                  ? "It works until someone revokes it."
                  : `On ${dateLabel(now + days * DAY, now)}. Requests with it fail after that.`
              }
            />
            <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
          </form>
        )
      }
    </Dialog>
  );
}
