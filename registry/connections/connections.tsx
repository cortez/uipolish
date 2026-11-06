"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { ButtonLink } from "../button/button-link";
import { Icon } from "../icons/icons";
import { Switch } from "../switch/switch";
import { TextField } from "../text-field/text-field";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./connections.module.css";

export type ConnectionStatus = "connected" | "connecting" | "needs-auth" | "error" | "disabled";

export type ConnectionTool = {
  /** As the server names it: `create_booking`. */
  name: string;
  /** One line on what it does. */
  description?: string;
};

export type Connection = {
  id: string;
  name: string;
  /** Shown in mono: "mcp.acme.example.com". */
  host: string;
  /** A 20px logo. Without one, the first letter stands in. */
  mark?: ReactNode;
  status: ConnectionStatus;
  /** What the server offers. Leave out until it has answered. */
  tools?: ConnectionTool[];
  /** What the person allowed when they signed in: "Read your bookings". */
  granted?: string[];
  /** The account it's signed in as. */
  account?: string;
  /** With `error` or `needs-auth`: what happened. */
  message?: string;
};

export type AddServerState =
  | { status: "idle" }
  | { status: "checking"; url: string }
  | { status: "signing-in"; url: string; signInUrl: string; name?: string }
  | { status: "failed"; url: string; error: string };

type ConnectionsProps = {
  servers: Connection[];
  /** The agent's name, used in sentences: "Copper can’t use Ledger…". */
  agent: string;
  /** Controlled. Leave out `onAdd` to hide the add form. */
  add?: AddServerState;
  /** Called with a checked https URL. */
  onAdd?: (url: string) => void;
  onCancelAdd?: () => void;
  onToggle?: (id: string, on: boolean) => void;
  /** `needs-auth`: start sign-in again. */
  onReconnect?: (id: string) => void;
  /** `error`: try the handshake again. */
  onRetry?: (id: string) => void;
  /** Return a promise to show the button busy until it settles. Remove the server from `servers` to remove the row. */
  onDisconnect?: (id: string) => void | Promise<void>;
  /** Names the list for screen readers. */
  label?: string;
  className?: string;
};

/** The status line under a server's name. Connected servers show their tool count instead. */
const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  "needs-auth": "Signed out",
  error: "Can’t connect",
  disabled: "Off",
};

const TOOL_LIMIT = 6;

function plural(n: number, one: string) {
  return `${n} ${n === 1 ? one : `${one}s`}`;
}

function said(server: Connection) {
  switch (server.status) {
    case "connected":
      return `${server.name} connected`;
    case "connecting":
      return `Connecting to ${server.name}`;
    case "needs-auth":
      return `${server.name} needs you to sign in again`;
    case "error":
      return `${server.name} can’t connect${server.message ? `: ${server.message}` : ""}`;
    case "disabled":
      return `${server.name} turned off`;
  }
}

/** Accepts "mcp.example.com" or a full URL; only https, except on localhost. */
export function parseServerUrl(raw: string, agent: string): { url: string; host: string } | { error: string } {
  const text = raw.trim();
  const notAddress = "That isn’t a web address. Try something like mcp.example.com.";
  if (!text) return { error: "Enter the server’s address, like mcp.example.com." };
  if (/\s/.test(text)) return { error: "Addresses can’t contain spaces. Check what you pasted." };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: notAddress };
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    return { error: `Use an https:// address. ${agent} only connects over HTTPS, except to localhost.` };
  }
  if (!local && !url.hostname.includes(".")) return { error: notAddress };
  if (url.username || url.password) return { error: "Leave the name and password out. You’ll sign in on the server’s own page." };
  url.hash = "";
  return { url: url.href, host: url.host };
}

function Mark({ server }: { server: Connection }) {
  return (
    <span className={styles.mark} aria-hidden="true">
      {server.mark ?? <span className={styles.initial}>{server.name.trim().charAt(0).toLocaleUpperCase()}</span>}
    </span>
  );
}

type RowProps = {
  server: Connection;
  agent: string;
  leaving: boolean;
  arrived: boolean;
  onToggle?: (id: string, on: boolean) => void;
  onReconnect?: (id: string) => void;
  onRetry?: (id: string) => void;
  onDisconnect?: (id: string) => void | Promise<void>;
  onLeaveWithFocus: (row: HTMLLIElement) => void;
  onGone: (id: string) => void;
};

function Row({ server, agent, leaving, arrived, onToggle, onReconnect, onRetry, onDisconnect, onLeaveWithFocus, onGone }: RowProps) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const metaId = `${baseId}-meta`;
  const rowRef = useRef<HTMLLIElement>(null);
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const disconnectRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { name, status, tools, granted } = server;
  const toolCount = tools ? plural(tools.length, "tool") : null;
  const statusText = status === "connected" && toolCount ? toolCount : STATUS_TEXT[status];
  const action =
    status === "needs-auth" && onReconnect
      ? { label: "Sign in", name: `Sign in to ${name} again`, run: onReconnect }
      : status === "error" && onRetry
        ? { label: "Retry", name: `Retry ${name}`, run: onRetry }
        : null;

  // What went wrong, in full, at the top of the opened row.
  const notice =
    status === "error"
      ? { kind: "error" as const, text: server.message ?? `${name} didn’t answer. Check the address, or try again in a minute.` }
      : status === "needs-auth"
        ? { kind: "needs-auth" as const, text: server.message ?? `Your sign-in expired. ${agent} can’t use ${name} until you sign in again.` }
        : null;

  // The removed row is inert; take focus somewhere that stays.
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (leaving && row?.contains(document.activeElement)) onLeaveWithFocus(row);
  }, [leaving, onLeaveWithFocus]);

  // Gone once its space has closed; the timer covers reduced motion and missed events.
  useEffect(() => {
    if (!leaving) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => onGone(server.id), reduce ? 0 : 700);
    return () => window.clearTimeout(timer);
  }, [leaving, onGone, server.id]);

  const wasConfirming = useRef(confirming);
  useLayoutEffect(() => {
    // The safe choice takes focus.
    if (confirming && !wasConfirming.current) cancelRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  function toggleOpen() {
    setOpen((o) => !o);
    setConfirming(false);
    setFailure(null);
  }

  // The action leaves with the status that needed it; keep focus on this row.
  function act(fn?: (id: string) => void) {
    fn?.(server.id);
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active.closest("[inert]")) disclosureRef.current?.focus();
    });
  }

  function cancelConfirm() {
    setConfirming(false);
    setFailure(null);
    requestAnimationFrame(() => disconnectRef.current?.focus());
  }

  async function disconnect() {
    setFailure(null);
    const result = onDisconnect?.(server.id);
    if (!result || typeof result.then !== "function") return;
    setBusy(true);
    try {
      await result;
    } catch (reason) {
      setFailure(reason instanceof Error && reason.message ? reason.message : `${name} didn’t disconnect. Try again.`);
    }
    setBusy(false);
  }

  function onConfirmKey(event: KeyboardEvent) {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      cancelConfirm();
    }
  }

  const shownTools = tools && !showAll && tools.length > TOOL_LIMIT ? tools.slice(0, TOOL_LIMIT - 1) : tools;
  const hidden = tools ? tools.length - (shownTools?.length ?? 0) : 0;

  let toolsNote = "";
  if (status === "disabled") toolsNote = `Off. ${agent} can’t use these until you turn ${name} back on.`;
  else if (status === "needs-auth" && tools?.length) toolsNote = `${agent} can’t use these until you sign in again.`;

  return (
    <li
      ref={rowRef}
      className={styles.row}
      data-row-id={server.id}
      data-status={status}
      data-open={open}
      data-leaving={leaving || undefined}
      data-arrived={arrived || undefined}
      inert={leaving || undefined}
      onTransitionEnd={(e) => {
        if (leaving && e.target === e.currentTarget && e.propertyName === "grid-template-rows") onGone(server.id);
      }}
    >
      <div className={styles.rowClip}>
        <div className={styles.rowInner}>
          <div className={styles.head}>
            <Mark server={server} />
            <div className={styles.text}>
              <button
                ref={disclosureRef}
                type="button"
                className={styles.disclosure}
                data-row-disclosure
                aria-expanded={open}
                aria-controls={panelId}
                aria-describedby={metaId}
                onClick={toggleOpen}
              >
                <span className={styles.name}>{name}</span>
              </button>
              <span className={styles.meta} data-status={status}>
                <span id={metaId} className={status === "connecting" ? styles.sweep : undefined}>
                  <TextMorph>{statusText}</TextMorph>
                </span>
                {action && (
                  <>
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                    <button type="button" className={styles.action} aria-label={action.name} onClick={() => act(action.run)}>
                      {action.label}
                    </button>
                  </>
                )}
              </span>
            </div>
            <span className={styles.control}>
              <Switch
                aria-label={`Use ${name}`}
                checked={status !== "disabled"}
                onChange={(e) => onToggle?.(server.id, e.currentTarget.checked)}
              />
            </span>
          </div>

          <div id={panelId} className={styles.panel} data-open={open} inert={!open || undefined}>
            <div className={styles.clip}>
              <div className={styles.panelInner}>
                <div className={styles.about}>
                  <code className={styles.host}>{server.host}</code>
                  {notice && (
                    <p className={styles.problem} data-kind={notice.kind}>
                      {notice.text}
                    </p>
                  )}
                </div>
                <div className={styles.section}>
                  <span className={styles.sectionLabel} id={`${baseId}-tools`}>
                    Tools
                  </span>
                  {toolsNote && <p className={styles.sectionNote}>{toolsNote}</p>}
                  {!tools ? (
                    <p className={styles.sectionNote}>
                      {status === "connecting" ? `Tools show once ${name} answers.` : `No tools until ${name} answers.`}
                    </p>
                  ) : tools.length === 0 ? (
                    <p className={styles.sectionNote}>{name} doesn’t offer any tools yet.</p>
                  ) : (
                    <AnimatedSize>
                      <ul className={styles.tools} aria-labelledby={`${baseId}-tools`}>
                        {shownTools?.map((tool) => (
                          <li key={tool.name} className={styles.tool}>
                            <code className={styles.toolName}>{tool.name}</code>
                            {tool.description && <span className={styles.toolDescription}>{tool.description}</span>}
                          </li>
                        ))}
                      </ul>
                      {tools.length > TOOL_LIMIT && (
                        <Button variant="ghost" className={styles.more} onClick={() => setShowAll((s) => !s)}>
                          {showAll ? "Show fewer" : `Show ${hidden} more`}
                        </Button>
                      )}
                    </AnimatedSize>
                  )}
                </div>

                {(granted?.length || server.account) && (
                  <div className={styles.section}>
                    <span className={styles.sectionLabel} id={`${baseId}-granted`}>
                      Allowed when you signed in
                    </span>
                    {granted && granted.length > 0 && (
                      <ul className={styles.granted} aria-labelledby={`${baseId}-granted`}>
                        {granted.map((g) => (
                          <li key={g}>
                            <Icon name="check" className={styles.bullet} />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {server.account && (
                      <p className={styles.sectionNote}>
                        Signed in as <span className={styles.account}>{server.account}</span>
                      </p>
                    )}
                  </div>
                )}

                {onDisconnect && (
                  <AnimatedSize>
                    {confirming ? (
                      <div key="confirm" className={styles.confirm} data-enter role="group" aria-label={`Disconnect ${name}?`} onKeyDown={onConfirmKey}>
                        <p>
                          <strong>Disconnect {name}?</strong> {agent} loses {tools?.length ? `its ${plural(tools.length, "tool")}` : "access to it"}. To add it back,
                          you’ll sign in again.
                        </p>
                        {failure && (
                          <p className={styles.failure} role="alert">
                            {failure}
                          </p>
                        )}
                        <div className={styles.confirmActions}>
                          <Button ref={cancelRef} variant="secondary" onClick={cancelConfirm} disabled={busy}>
                            Cancel
                          </Button>
                          <Button variant="danger" busy={busy} busyLabel="Disconnecting…" onClick={disconnect}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key="idle" className={styles.footer}>
                        <Button ref={disconnectRef} variant="secondary" onClick={() => setConfirming(true)}>
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </AnimatedSize>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function AddServer({
  agent,
  add,
  servers,
  onAdd,
  onCancelAdd,
  regionRef,
  inputRef,
  titleRef,
}: {
  agent: string;
  add: AddServerState;
  servers: Connection[];
  onAdd: (url: string) => void;
  onCancelAdd?: () => void;
  regionRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  titleRef: RefObject<HTMLParagraphElement | null>;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  // Closed to one "Add server" row until it's wanted; open when the list is
  // empty, since adding is then the only thing to do.
  const [opened, setOpened] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const open = opened || servers.length === 0 || add.status !== "idle";

  // A finished add empties the field and closes it; a cancelled one keeps it.
  const [lastStatus, setLastStatus] = useState(add.status);
  const [lastCount, setLastCount] = useState(servers.length);
  if (lastStatus !== add.status || lastCount !== servers.length) {
    setLastStatus(add.status);
    setLastCount(servers.length);
    if (add.status === "idle" && lastStatus !== "failed" && lastStatus !== add.status) setValue("");
    if (add.status === "idle" && servers.length > lastCount) setOpened(false);
  }

  function openForm() {
    setOpened(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeForm() {
    setOpened(false);
    setValue("");
    setLocalError(null);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  function check(text: string) {
    const parsed = parseServerUrl(text, agent);
    if ("error" in parsed) return { error: parsed.error };
    const twin = servers.find((s) => s.host.toLowerCase() === parsed.host.toLowerCase());
    if (twin) return { error: `${twin.name} is already at ${parsed.host}.` };
    return { url: parsed.url };
  }

  // The server's error holds until the address is edited.
  const current = parseServerUrl(value, agent);
  const serverError = add.status === "failed" && "url" in current && current.url === add.url ? add.error : null;
  const error = localError ?? serverError;
  const checking = add.status === "checking";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (checking) return;
    const result = check(value);
    if (result.error) {
      setLocalError(result.error);
      inputRef.current?.focus();
      return;
    }
    setLocalError(null);
    onAdd(result.url!);
  }

  const signingIn = add.status === "signing-in" ? add : null;
  const signInHost = signingIn ? new URL(signingIn.url).host : "";
  const signInName = signingIn?.name ?? signInHost;

  return (
    <div ref={regionRef} className={styles.add}>
      <AnimatedSize>
        {signingIn ? (
          <div key="signin" className={styles.signin} data-enter>
            <span className={styles.signinMark} aria-hidden="true">
              <Icon name="external" />
            </span>
            <div className={styles.signinText}>
              <p ref={titleRef} tabIndex={-1} className={styles.signinTitle}>
                Finish signing in in your browser
              </p>
              <p className={styles.signinNote}>
                {signInName}’s sign-in page should be open in a new tab. Allow {agent} there, and it will show up here.
              </p>
              <p className={styles.waiting}>
                <span className={styles.sweep}>Waiting for {signInHost}…</span>
              </p>
              <div className={styles.signinActions}>
                <ButtonLink href={signingIn.signInUrl} target="_blank" rel="noopener noreferrer">
                  Open sign-in page
                  <Icon name="external" />
                  <span className={styles.srOnly}> (opens in a new tab)</span>
                </ButtonLink>
                {onCancelAdd && (
                  <Button variant="secondary" onClick={onCancelAdd}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : !open ? (
          <button key="toggle" ref={toggleRef} type="button" className={styles.addRow} onClick={openForm}>
            <span className={styles.addIcon} aria-hidden="true">
              <Icon name="plus" />
            </span>
            Add server
          </button>
        ) : (
          <form key="form" className={styles.form} onSubmit={submit} noValidate>
            <TextField
              ref={inputRef}
              label="Server address"
              hint="You’ll sign in to it in your browser."
              placeholder="mcp.example.com"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              readOnly={checking}
              error={error ?? null}
              onChange={(e) => {
                setValue(e.currentTarget.value);
                if (localError) setLocalError(check(e.currentTarget.value).error ?? null);
              }}
            />
            <div className={styles.formActions}>
              {servers.length > 0 && (
                <Button variant="ghost" onClick={closeForm} disabled={checking}>
                  Cancel
                </Button>
              )}
              <Button type="submit" busy={checking} busyLabel="Checking…">
                Add
              </Button>
            </div>
          </form>
        )}
      </AnimatedSize>
    </div>
  );
}

/** The MCP servers an agent is connected to: status, tools, what each was allowed, and adding more. */
export function Connections({
  servers,
  agent,
  add = { status: "idle" },
  onAdd,
  onCancelAdd,
  onToggle,
  onReconnect,
  onRetry,
  onDisconnect,
  label = "MCP servers",
  className,
}: ConnectionsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);

  // Removed servers stay in place, inert, until their row has closed.
  const [previous, setPrevious] = useState(servers);
  const [leaving, setLeaving] = useState<{ server: Connection; index: number }[]>([]);
  const [arrived, setArrived] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");
  const [previousAdd, setPreviousAdd] = useState(add.status);

  if (previous !== servers) {
    setPrevious(servers);
    const ids = new Set(servers.map((s) => s.id));
    const gone = previous.flatMap((server, index) => (ids.has(server.id) ? [] : [{ server, index }]));
    setLeaving((l) => [...l.filter((x) => !ids.has(x.server.id)), ...gone]);
    const fresh = servers.filter((s) => !previous.some((p) => p.id === s.id));
    if (fresh.length) setArrived((a) => new Set([...a, ...fresh.map((s) => s.id)]));

    const lines: string[] = [];
    for (const server of servers) {
      const before = previous.find((p) => p.id === server.id);
      if (!before) lines.push(server.status === "connected" ? `${server.name} added` : `${server.name} added. ${said(server)}`);
      else if (before.status !== server.status || (server.status === "error" && before.message !== server.message)) lines.push(said(server));
    }
    for (const { server } of gone) lines.push(`${server.name} disconnected`);
    if (lines.length) setAnnouncement(lines.join(". "));
  }

  if (previousAdd !== add.status) {
    setPreviousAdd(add.status);
    if (add.status === "checking") setAnnouncement(`Checking ${add.url}`);
  }

  const rows = servers.map((server) => ({ server, leaving: false }));
  for (const l of [...leaving].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(l.index, rows.length), 0, { server: l.server, leaving: true });
  }

  // Focus follows the add flow: into the sign-in step, then to the new row,
  // or back to the field when it fails or is cancelled.
  const lastIds = useRef(servers.map((s) => s.id));
  const lastAdd = useRef(add.status);
  useLayoutEffect(() => {
    const ids = servers.map((s) => s.id);
    const fresh = ids.filter((id) => !lastIds.current.includes(id));
    lastIds.current = ids;
    const was = lastAdd.current;
    lastAdd.current = add.status;
    if (was === add.status) return;
    if (add.status === "signing-in") {
      titleRef.current?.focus();
      return;
    }
    const active = document.activeElement;
    const lost = !active || active === document.body || addRef.current?.contains(active);
    if (!lost || (was !== "checking" && was !== "signing-in")) return;
    if (add.status === "idle" && fresh.length) {
      listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(fresh.at(-1)!)}"] [data-row-disclosure]`)?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [servers, add.status]);

  const leaveWithFocus = useCallback((row: HTMLLIElement) => {
    const next = (from: Element | null, step: "nextElementSibling" | "previousElementSibling") => {
      for (let el = from?.[step] ?? null; el; el = el[step]) {
        if (!el.hasAttribute("data-leaving")) return el.querySelector<HTMLElement>("[data-row-disclosure]");
      }
      return null;
    };
    const target = next(row, "nextElementSibling") ?? next(row, "previousElementSibling") ?? inputRef.current;
    target?.focus();
  }, []);

  const gone = useCallback((id: string) => setLeaving((l) => l.filter((x) => x.server.id !== id)), []);

  const empty = rows.length === 0;

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      {empty ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No servers yet</p>
          <p className={styles.emptyNote}>Add an MCP server to give {agent} tools, like your bookings or payments.</p>
        </div>
      ) : (
        <ul ref={listRef} className={styles.list} aria-label={label}>
          {rows.map(({ server, leaving: isLeaving }) => (
            <Row
                key={server.id}
                server={server}
                agent={agent}
                leaving={isLeaving}
                arrived={arrived.has(server.id)}
                onToggle={onToggle}
                onReconnect={onReconnect}
                onRetry={onRetry}
                onDisconnect={onDisconnect}
                onLeaveWithFocus={leaveWithFocus}
                onGone={gone}
              />
          ))}
        </ul>
      )}

      {onAdd && (
        <AddServer
          agent={agent}
          add={add}
          servers={servers}
          onAdd={onAdd}
          onCancelAdd={onCancelAdd}
          regionRef={addRef}
          inputRef={inputRef}
          titleRef={titleRef}
        />
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
