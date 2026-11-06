"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { Icon } from "../icons/icons";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Select } from "../select/select";
import styles from "./authorize.module.css";

export type AuthorizeStatus = "review" | "submitting" | "connected" | "denied" | "error";

export type AuthorizeScope = {
  id: string;
  /** What it lets the client do, starting with the verb: "See your bookings", "Issue refunds". */
  title: string;
  /** One short line, only when the title isn't enough. */
  description?: string;
  /** Whether it can change anything. Unticking every `write` scope makes the button "Allow read-only". */
  access: "read" | "write";
  /** Required scopes can't be unticked; optional ones show a checkbox. */
  required?: boolean;
  /** Optional scopes start ticked unless this is false. */
  defaultGranted?: boolean;
};

type Party = {
  name: string;
  /** A logo, drawn at 28px on a 48px tile. Without one, the first letter stands in, on a tint picked from the name. */
  mark?: ReactNode;
};

type AuthorizeProps = {
  /** The agent or app asking. `returnTo` is the redirect URI's host and port. */
  client: Party & { returnTo: string; verified?: boolean };
  /** Your MCP server or app. */
  server: Party;
  /** Who is signed in. Without it, the account line is left out. */
  account?: { email: string };
  /** Other accounts signed in on this browser, offered in the account select. */
  otherAccounts?: string[];
  /** Called with the email picked, or with nothing for "Use another account". Without it, the email is plain text. */
  onSwitchAccount?: (email?: string) => void;
  scopes: AuthorizeScope[];
  /** Controlled. `submitting` while your server issues the grant. */
  status?: AuthorizeStatus;
  /** Shown with `error`. Say what failed. */
  error?: string;
  /** Called with the ids of every scope the person left ticked. */
  onAllow: (granted: string[]) => void;
  onDeny: () => void;
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

/** The select's "Use another account" option. */
const OTHER = "__other__";

/** Hues a monogram can land on, spread so two names rarely share one. */
const HUES = [262, 290, 330, 18, 52, 150, 190, 228];

/** The same name always gets the same hue, so an app keeps its color between visits. */
function hueOf(name: string) {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return HUES[h % HUES.length];
}

function Mark({ party }: { party: Party }) {
  if (party.mark) return <span className={styles.mark}>{party.mark}</span>;
  return (
    <span className={`${styles.mark} ${styles.monogram}`} style={{ "--authorize-hue": hueOf(party.name) } as CSSProperties}>
      {[...party.name.trim()][0]?.toLocaleUpperCase()}
    </span>
  );
}

/** An OAuth consent screen for an agent connecting to an MCP server. */
export function Authorize({
  client,
  server,
  account,
  otherAccounts = [],
  onSwitchAccount,
  scopes,
  status = "review",
  error,
  onAllow,
  onDeny,
  headingLevel = 1,
  className,
}: AuthorizeProps) {
  const H = `h${headingLevel}` as "h1";
  const titleId = useId();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [granted, setGranted] = useState(
    () => new Set(scopes.filter((s) => s.required || s.defaultGranted !== false).map((s) => s.id)),
  );

  const settled = status === "connected" || status === "denied";
  const busy = status === "submitting";
  // The controls dim when the button shows it's busy, not at the click, so
  // a quick grant never flashes the list.
  const busyShown = useDelayedBusy(busy);
  const writes = scopes.filter((s) => s.access === "write");
  const readOnly = writes.length > 0 && writes.every((s) => !granted.has(s.id));

  // A retry keeps "Try again" until the busy label takes over, instead of
  // flicking back to "Allow" for the first 300ms.
  const [prevStatus, setPrevStatus] = useState(status);
  const [retrying, setRetrying] = useState(false);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setRetrying(status === "submitting" && (prevStatus === "error" || (prevStatus === "submitting" && retrying)));
  }
  const label = status === "error" || (busy && retrying) ? "Try again" : readOnly ? "Allow read-only" : "Allow";

  // The result replaces the buttons, so focus follows it.
  const wasSettled = useRef(settled);
  useLayoutEffect(() => {
    if (settled && !wasSettled.current) resultRef.current?.focus();
    wasSettled.current = settled;
  }, [settled]);

  function toggle(id: string, on: boolean) {
    setGranted((all) => {
      const next = new Set(all);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <section
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
    >
      <div className={styles.marks} aria-hidden="true">
        <Mark party={client} />
        {/* A dotted line that turns solid once they're joined. Only a result
            gets a mark: a check when connected, an x when it failed. */}
        <span className={styles.link}>
          <span className={styles.dots} />
          <span className={styles.solid} />
          <span className={styles.result} data-result="connected">
            <Icon name="check" />
          </span>
          <span className={styles.result} data-result="error">
            <Icon name="close" />
          </span>
        </span>
        <Mark party={server} />
      </div>

      <AnimatedSize>
        {settled ? (
          <div key="result" className={styles.body} data-enter>
            <div className={styles.head}>
              <H id={titleId} ref={resultRef} tabIndex={-1} className={styles.title}>
                {status === "connected" ? `Connected to ${server.name}` : "Not connected"}
              </H>
              <p className={styles.sub}>
                {status === "connected"
                  ? `You can close this tab and go back to ${client.name}.`
                  : `Nothing from ${server.name} was shared with ${client.name}.`}
              </p>
            </div>
          </div>
        ) : (
          <div key="review" className={styles.body}>
            <div className={styles.head}>
              <H id={titleId} className={styles.title}>
                {client.name} wants to access {server.name}
              </H>
              {account &&
                (onSwitchAccount ? (
                  <div className={`${styles.sub} ${styles.accountRow}`}>
                    {/* Which account it acts as is a choice of value, so it's a select. */}
                    <Select
                      size="sm"
                      aria-label="Account"
                      className={styles.account}
                      disabled={busyShown}
                      value={account.email}
                      onValueChange={(v) => onSwitchAccount(v === OTHER ? undefined : v)}
                      options={[
                        ...[account.email, ...otherAccounts.filter((e) => e !== account.email)].map((e) => ({ value: e, label: e })),
                        { value: OTHER, label: "Use another account" },
                      ]}
                    />
                  </div>
                ) : (
                  <p className={styles.sub}>{account.email}</p>
                ))}
            </div>

            <div className={styles.scopes} inert={busy || undefined}>
              <ul aria-label="It will be able to">
                {scopes.map((s) =>
                  s.required ? (
                    <li key={s.id} className={styles.scope}>
                      <span className={styles.locked} aria-hidden="true">
                        <Icon name="check" />
                      </span>
                      <span className={styles.text}>
                        <span>
                          {s.title}
                          <span className={styles.srOnly}> (always included)</span>
                        </span>
                        {s.description && <span className={styles.description}>{s.description}</span>}
                      </span>
                    </li>
                  ) : (
                    <li key={s.id}>
                      <Checkbox
                        label={s.title}
                        description={s.description}
                        checked={granted.has(s.id)}
                        disabled={busyShown}
                        onCheckedChange={(on) => toggle(s.id, on)}
                      />
                    </li>
                  ),
                )}
              </ul>
            </div>

            {!client.verified && (
              <p className={styles.warning}>
                <Icon name="warning" />
                <span>
                  {server.name} hasn’t verified {client.name}. Only allow it if you started this yourself.
                </span>
              </p>
            )}

            <div className={styles.foot}>
              <div className={styles.buttons}>
                <Button busy={busy} busyLabel="Connecting…" onClick={() => onAllow(scopes.filter((s) => granted.has(s.id)).map((s) => s.id))}>
                  {label}
                </Button>
                <Button variant="ghost" onClick={() => !busy && onDeny()} disabled={busyShown}>
                  Cancel
                </Button>
              </div>
              {/* Under Cancel, not above Allow: the button just pressed never
                  moves. Its room opens smoothly, so the line under it glides. */}
              <AnimatedSize className={styles.errorSlot}>
                {status === "error" && (
                  <p className={styles.error} role="alert">
                    <Icon name="alert" />
                    <span>{error ?? `${server.name} couldn’t finish connecting. Nothing was shared.`}</span>
                  </p>
                )}
              </AnimatedSize>
              <p className={styles.host}>
                You’ll return to <code>{client.returnTo}</code>
              </p>
            </div>
          </div>
        )}
      </AnimatedSize>

      <span role="status" className={styles.srOnly}>
        {busy ? `Connecting ${client.name} to ${server.name}` : ""}
      </span>
    </section>
  );
}
