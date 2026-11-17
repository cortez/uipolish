"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Alert } from "../alert/alert";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Checkbox } from "../checkbox/checkbox";
import { Dialog } from "../dialog/dialog";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { Kbd } from "../kbd/kbd";
import { SearchField } from "../search-field/search-field";
import { Select } from "../select/select";
import { Tab, TabList, Tabs } from "../tabs/tabs";
import { toast } from "../toast/toast";
import { Detail, type DetailHandle } from "./detail";
import {
  Countdown,
  DAY,
  HOUR,
  MINUTE,
  PriorityBadge,
  SECOND,
  dueLabel,
  message,
  plural,
  priorityOf,
  requesterOf,
  searchText,
  toTime,
  usePresence,
  when,
  type ApprovalDecision,
  type ApprovalPriority,
  type ApprovalRequest,
  type ApprovalRequester,
  type ApprovalStatus,
} from "./parts";
import styles from "./approvals-inbox.module.css";

export type {
  ApprovalAgent,
  ApprovalDecision,
  ApprovalDetailRow,
  ApprovalField,
  ApprovalOutcome,
  ApprovalPreview,
  ApprovalPriority,
  ApprovalRecipient,
  ApprovalRequest,
  ApprovalRequester,
  ApprovalRisk,
  ApprovalStatus,
  ApprovalTool,
} from "./parts";

/** `agent` and `urgency` are the old names of `requester` and `due`, still accepted. */
export type ApprovalGrouping = "none" | "requester" | "due" | "agent" | "urgency";

export type ApprovalsInboxProps = {
  /** Every request you have, in any status. The inbox sorts, groups and filters them. */
  requests: ApprovalRequest[];
  /**
   * Called once the undo window has passed. Resolve when the decision is
   * recorded and update the request's `status` (and `outcome`); reject with
   * an Error to put it back in Pending with the message.
   */
  onDecide: (decision: ApprovalDecision) => Promise<unknown>;
  /** Put an expired request back in Pending: shows **Reopen** on expired requests. */
  onRequeue?: (id: string) => void | Promise<unknown>;
  /** False for people who can see requests but not decide them. */
  canDecide?: boolean;
  /** Shown where the buttons would be when `canDecide` is false: who can approve. */
  permissionNote?: string;
  /** Requests are loading for the first time. */
  loading?: boolean;
  /** Requests couldn't load: say why. Shown with Retry when `onRetry` is set. */
  error?: string | null;
  onRetry?: () => void;
  /** Milliseconds a decision can be undone before `onDecide` is called. 0 sends at once. */
  undoWindow?: number;
  defaultFilter?: ApprovalStatus;
  /** `none` (default), `requester` or `due`. */
  defaultGrouping?: ApprovalGrouping;
  /** **Bulk approve** opens a dialog to tick several pending requests and approve them together. Default `true`. */
  bulk?: boolean;
  /**
   * @deprecated Use `bulk`. `false` hides bulk approve; `"low"` offers only
   * low-priority requests, ticked to start with.
   */
  bulkRisk?: ApprovalPriority | false;
  title?: string;
  description?: string;
  className?: string;
};

type Entry =
  | { id: string; kind: "group"; label: string; count: number; requester?: ApprovalRequester }
  | { id: string; kind: "row"; request: ApprovalRequest };

type Held = { decision: ApprovalDecision; phase: "holding" | "sending" | "done" };
type Batch = { ids: string[]; timer: number; toastId: string };

const FILTERS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

const GROUPINGS = [
  { value: "none", label: "No grouping" },
  { value: "requester", label: "By requester" },
  { value: "due", label: "By due date" },
];

const normalizeGrouping = (g: ApprovalGrouping) => (g === "agent" ? "requester" : g === "urgency" ? "due" : g);

// Below this width, the list and the request take turns.
const NARROW = 640;

function useNarrow(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setNarrow(el.getBoundingClientRect().width < NARROW);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return narrow;
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

const settledAt = (r: ApprovalRequest) => (r.outcome ? toTime(r.outcome.at) : r.expiresAt ? toTime(r.expiresAt) : toTime(r.requestedAt));

function dueGroup(r: ApprovalRequest, now: number, filter: ApprovalStatus) {
  if (filter !== "pending") {
    const at = settledAt(r);
    return new Date(at).toDateString() === new Date(now).toDateString() ? "Today" : "Earlier";
  }
  if (!r.expiresAt) return "No due date";
  const due = new Date(toTime(r.expiresAt));
  if (due.toDateString() === new Date(now).toDateString()) return "Due today";
  if (due.toDateString() === new Date(now + DAY).toDateString()) return "Due tomorrow";
  return "Due later";
}

const DUE_ORDER = ["Due today", "Due tomorrow", "Due later", "No due date", "Today", "Earlier"];
const PRIORITY_RANK: Record<ApprovalPriority, number> = { high: 0, medium: 1, low: 2 };
const rank = (r: ApprovalRequest) => {
  const p = priorityOf(r);
  return p ? PRIORITY_RANK[p] : 1;
};

function shownOrder(list: ApprovalRequest[]) {
  return [...list].sort(
    (a, b) =>
      (a.expiresAt ? toTime(a.expiresAt) : Infinity) - (b.expiresAt ? toTime(b.expiresAt) : Infinity) ||
      rank(a) - rank(b) ||
      toTime(b.requestedAt) - toTime(a.requestedAt),
  );
}

/** Where a team decides what's waiting on it: a list to triage, the request in full beside it. */
export function ApprovalsInbox({
  requests,
  onDecide,
  onRequeue,
  canDecide = true,
  permissionNote = "Only owners and admins can approve requests.",
  loading = false,
  error = null,
  onRetry,
  undoWindow = 6000,
  defaultFilter = "pending",
  defaultGrouping = "none",
  bulk = true,
  bulkRisk,
  title = "Approvals",
  description = "Requests waiting on a decision from you or your team.",
  className,
}: ApprovalsInboxProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const rootRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const detailRef = useRef<DetailHandle>(null);
  const narrow = useNarrow(rootRef);

  const [filter, setFilter] = useState<ApprovalStatus>(defaultFilter);
  const [grouping, setGrouping] = useState(() => normalizeGrouping(defaultGrouping));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState<"list" | "detail">("list");
  const [held, setHeld] = useState<Record<string, Held>>({});
  const [busy, setBusy] = useState<Record<string, "approve" | "decline">>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [focusRow, setFocusRow] = useState(0);

  /* ---------- A clock: every second while something expires within the hour ---------- */

  const [now, setNow] = useState(() => Date.now());
  const soonest = useMemo(() => {
    let min = Infinity;
    for (const r of requests) if (r.status === "pending" && r.expiresAt) min = Math.min(min, toTime(r.expiresAt));
    return min;
  }, [requests]);
  const fast = soonest - now < HOUR + MINUTE;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), fast ? SECOND : 30 * SECOND);
    return () => window.clearInterval(timer);
  }, [fast]);

  /* ---------- Status as it stands, decisions in flight included ---------- */

  const statusOf = useCallback(
    (r: ApprovalRequest): ApprovalStatus | "held" => {
      if (r.status !== "pending") return r.status;
      if (held[r.id]) return "held";
      if (r.expiresAt && toTime(r.expiresAt) <= now) return "expired";
      return "pending";
    },
    [held, now],
  );

  const counts = useMemo(() => {
    const c: Record<ApprovalStatus, number> = { pending: 0, approved: 0, declined: 0, expired: 0 };
    for (const r of requests) {
      const s = statusOf(r);
      if (s !== "held") c[s] += 1;
    }
    return c;
  }, [requests, statusOf]);

  const q = query.trim().toLowerCase();
  const haystacks = useMemo(() => new Map(requests.map((r) => [r.id, searchText(r)])), [requests]);
  const matches = useCallback((r: ApprovalRequest) => !q || !!haystacks.get(r.id)?.includes(q), [q, haystacks]);

  const shown = useMemo(() => {
    const list = requests.filter((r) => {
      const s = statusOf(r);
      // An open request that runs out of time stays put, so it doesn't vanish mid-read.
      const stays = filter === "pending" && s === "expired" && r.status === "pending" && r.id === selectedId;
      return (s === filter || stays) && matches(r);
    });
    return filter === "pending" ? shownOrder(list) : list.sort((a, b) => settledAt(b) - settledAt(a));
  }, [requests, statusOf, filter, matches, selectedId]);

  const entries = useMemo<Entry[]>(() => {
    if (grouping === "none") return shown.map((r) => ({ id: r.id, kind: "row", request: r }));
    const byRequester = grouping === "requester";
    const groups = new Map<string, { label: string; requester?: ApprovalRequester; items: ApprovalRequest[] }>();
    for (const r of shown) {
      const who = requesterOf(r);
      const key = byRequester ? who.id : dueGroup(r, now, filter);
      const group = groups.get(key) ?? { label: byRequester ? who.name : key, requester: byRequester ? who : undefined, items: [] };
      group.items.push(r);
      groups.set(key, group);
    }
    const ordered = [...groups.entries()].sort(([a, ga], [b, gb]) =>
      byRequester ? ga.label.localeCompare(gb.label) : DUE_ORDER.indexOf(a) - DUE_ORDER.indexOf(b),
    );
    return ordered.flatMap(([key, g]) => [
      { id: `group:${key}`, kind: "group" as const, label: g.label, count: g.items.length, requester: g.requester },
      ...g.items.map((r) => ({ id: r.id, kind: "row" as const, request: r })),
    ]);
  }, [shown, grouping, now, filter]);

  const visibleIds = useMemo(() => entries.flatMap((e) => (e.kind === "row" ? [e.id] : [])), [entries]);

  /* ---------- Selection follows the list: a decided request hands over to the next ---------- */

  const index = selectedId ? visibleIds.indexOf(selectedId) : -1;
  if (index >= 0 && index !== selectedIndex) setSelectedIndex(index);
  if (index === -1 && (selectedId !== null || visibleIds.length > 0)) {
    const next = visibleIds[Math.min(selectedIndex, visibleIds.length - 1)] ?? null;
    if (next !== selectedId) {
      setSelectedId(next);
      // On a phone, a decision returns to the list, where the row is seen leaving.
      if (narrow && view === "detail") setView("list");
    }
  }

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  // Moves focus to the selected row after the render that selected it.
  useLayoutEffect(() => {
    if (!focusRow) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(selectedId ?? "")}"]`);
    row?.focus({ preventScroll: false });
    row?.scrollIntoView({ block: "nearest" });
  }, [focusRow, selectedId]);

  const focusWasInside = () => !!rootRef.current?.contains(document.activeElement);

  function select(nextId: string, focus: boolean) {
    setSelectedId(nextId);
    if (focus) setFocusRow((n) => n + 1);
  }

  function move(step: 1 | -1) {
    if (visibleIds.length === 0) return;
    const i = selectedId ? visibleIds.indexOf(selectedId) : -1;
    const nextId = visibleIds[Math.max(0, Math.min(visibleIds.length - 1, i + step))];
    if (narrow && view === "detail") setView("list");
    select(nextId, true);
  }

  function open(requestId: string) {
    setSelectedId(requestId);
    if (narrow) {
      setView("detail");
      requestAnimationFrame(() => detailRef.current?.focusTitle());
    }
  }

  function back() {
    setView("list");
    setFocusRow((n) => n + 1);
  }

  /* ---------- Deciding: held for the undo window, then sent ---------- */

  const batches = useRef(new Map<string, Batch>());
  const decideRef = useRef(onDecide);
  const heldRef = useRef(held);
  useEffect(() => {
    decideRef.current = onDecide;
    heldRef.current = held;
  });

  // Leaving the page sends what's still held: the undo window was a courtesy, not a cancel.
  useEffect(() => {
    const live = batches.current;
    return () => {
      for (const batch of live.values()) {
        window.clearTimeout(batch.timer);
        toast.dismiss(batch.toastId);
        for (const requestId of batch.ids) {
          const h = heldRef.current[requestId];
          if (h) void decideRef.current(h.decision).catch(() => {});
        }
      }
      live.clear();
    };
  }, []);

  const titleOf = useCallback((requestId: string) => requests.find((r) => r.id === requestId)?.title ?? "Request", [requests]);

  async function send(decisions: ApprovalDecision[]) {
    setHeld((h) => {
      const next = { ...h };
      for (const d of decisions) next[d.id] = { decision: d, phase: "sending" };
      return next;
    });
    const results = await Promise.allSettled(decisions.map((d) => decideRef.current(d)));
    const failed: { d: ApprovalDecision; text: string }[] = [];
    setHeld((h) => {
      const next = { ...h };
      results.forEach((result, i) => {
        const d = decisions[i];
        if (result.status === "fulfilled") next[d.id] = { decision: d, phase: "done" };
        else delete next[d.id];
      });
      return next;
    });
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const d = decisions[i];
        failed.push({
          d,
          text: message(
            result.reason,
            `Your ${d.decision === "approve" ? "approval" : "decline"} wasn’t recorded. Nothing has changed yet.`,
          ),
        });
      }
    });
    if (failed.length === 0) return;
    setFailures((f) => {
      const next = { ...f };
      for (const { d, text } of failed) next[d.id] = text;
      return next;
    });
    const first = failed[0];
    toast.error(
      failed.length === 1
        ? `Couldn’t ${first.d.decision} “${titleOf(first.d.id)}”`
        : `${failed.length} of ${decisions.length} decisions didn’t go through`,
      {
        description: "It’s back in Pending. Nothing has changed.",
        action: {
          label: "Show",
          onClick: () => {
            setFilter("pending");
            setQuery("");
            open(first.d.id);
            if (!narrow) setFocusRow((n) => n + 1);
          },
        },
      },
    );
    setAnnouncement(failed.length === 1 ? `Couldn’t ${first.d.decision} ${titleOf(first.d.id)}. It’s back in Pending.` : `${failed.length} decisions didn’t go through.`);
  }

  function undo(batchId: string) {
    const batch = batches.current.get(batchId);
    if (!batch) return;
    window.clearTimeout(batch.timer);
    batches.current.delete(batchId);
    setHeld((h) => {
      const next = { ...h };
      for (const requestId of batch.ids) delete next[requestId];
      return next;
    });
    setFilter("pending");
    setSelectedId(batch.ids[0]);
    setFocusRow((n) => n + 1);
    setAnnouncement(batch.ids.length === 1 ? `Undone. ${titleOf(batch.ids[0])} is back in Pending.` : `Undone. ${batch.ids.length} requests are back in Pending.`);
  }

  async function decide(decisions: ApprovalDecision[]) {
    if (!canDecide || decisions.length === 0) return;
    const inside = focusWasInside();
    if (inside && !narrow) setFocusRow((n) => n + 1);

    // A retry after a failure goes straight out, busy on its button.
    const retry = decisions.length === 1 && failures[decisions[0].id];
    if (retry || undoWindow <= 0) {
      const d = decisions[0];
      setBusy((b) => ({ ...b, [d.id]: d.decision }));
      try {
        await decideRef.current(d);
        setHeld((h) => ({ ...h, [d.id]: { decision: d, phase: "done" } }));
        setFailures((f) => {
          const next = { ...f };
          delete next[d.id];
          return next;
        });
        setAnnouncement(`${d.decision === "approve" ? "Approved" : "Declined"}: ${titleOf(d.id)}.`);
      } catch (reason) {
        setFailures((f) => ({ ...f, [d.id]: message(reason, "It still didn’t go through. Check your connection and try again.") }));
      } finally {
        setBusy((b) => {
          const next = { ...b };
          delete next[d.id];
          return next;
        });
      }
      return;
    }

    setHeld((h) => {
      const next = { ...h };
      for (const d of decisions) next[d.id] = { decision: d, phase: "holding" };
      return next;
    });
    setFailures((f) => {
      const next = { ...f };
      for (const d of decisions) delete next[d.id];
      return next;
    });

    const batchId = `${decisions[0].id}-${Date.now()}`;
    const verb = decisions[0].decision === "approve" ? "Approved" : "Declined";
    const one = decisions.length === 1;
    const first = requests.find((r) => r.id === decisions[0].id);
    const name = first ? requesterOf(first).name : "The requester";
    const seconds = Math.round(undoWindow / 1000);
    const toastId = toast(one ? `${verb}: ${titleOf(decisions[0].id)}` : `${verb} ${plural(decisions.length, "request")}`, {
      description: one ? `${name} hears back in ${seconds} seconds.` : `Everyone who asked hears back in ${seconds} seconds.`,
      action: { label: "Undo", onClick: () => undo(batchId) },
      duration: undoWindow,
    });
    const timer = window.setTimeout(() => {
      batches.current.delete(batchId);
      toast.dismiss(toastId);
      void send(decisions);
    }, undoWindow);
    batches.current.set(batchId, { ids: decisions.map((d) => d.id), timer, toastId });
    setAnnouncement(one ? `${verb}: ${titleOf(decisions[0].id)}. Undo is in the notification.` : `${verb} ${decisions.length} requests.`);
  }

  async function requeue(requestId: string) {
    if (!onRequeue) return;
    try {
      await onRequeue(requestId);
      setAnnouncement(`Reopened: ${titleOf(requestId)}.`);
    } catch (reason) {
      toast.error("Couldn’t reopen it", { description: message(reason, "Try again in a moment.") });
    }
  }

  /* ---------- Keyboard triage ---------- */

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement;
    if (isEditable(target) || target.closest("[role='dialog'], [role='alertdialog'], [role='listbox'], [role='menu'], [role='tablist']")) return;
    const key = event.key.toLowerCase();
    const inList = !!listRef.current?.contains(target);
    if (key === "j" || (inList && key === "arrowdown")) {
      event.preventDefault();
      move(1);
    } else if (key === "k" || (inList && key === "arrowup")) {
      event.preventDefault();
      move(-1);
    } else if ((key === "a" || key === "d" || key === "e") && selected) {
      // On a phone's list, open the request first: nothing is decided unseen.
      if (narrow && view === "list") return;
      event.preventDefault();
      if (!canDecide) {
        setAnnouncement(permissionNote);
        return;
      }
      if (key === "a") detailRef.current?.approve();
      else if (key === "d") detailRef.current?.decline();
      else detailRef.current?.edit();
    } else if (key === "escape" && narrow && view === "detail") {
      event.preventDefault();
      back();
    }
  }

  /* ---------- Bulk approve ---------- */

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPicked, setBulkPicked] = useState<ReadonlySet<string>>(() => new Set());
  const bulkButton = useRef<HTMLButtonElement>(null);
  const bulkOn = bulk && bulkRisk !== false;
  // Most urgent first, the same order as the list.
  const bulkCandidates = bulkOn
    ? shownOrder(requests.filter((r) => statusOf(r) === "pending" && !failures[r.id] && (!bulkRisk || priorityOf(r) === bulkRisk)))
    : [];
  const showBulk = canDecide && filter === "pending" && bulkCandidates.length >= 2 && !loading && !error;
  const allPicked = bulkPicked.size === bulkCandidates.length;

  function openBulk() {
    // Nothing ticked: each one is a choice. The legacy `bulkRisk` starts with its level ticked.
    setBulkPicked(new Set(bulkRisk ? bulkCandidates.map((r) => r.id) : []));
    setBulkOpen(true);
  }

  /* ---------- Render ---------- */

  const loadingShown = useDelayedBusy(loading);
  const listKey = `${filter}|${grouping}|${q}`;
  const filterLabel = FILTERS.find((f) => f.value === filter)?.label.toLowerCase() ?? filter;
  const empty = !loading && !error && visibleIds.length === 0;

  let body;
  if (error) {
    body = (
      <div className={styles.whole}>
        <EmptyState
          art="unplugged"
          title="Couldn’t load requests"
          description={error}
          action={
            onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                <Icon name="retry" />
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  } else if (loading) {
    body = (
      <div className={styles.whole}>
        <p className={styles.loading} role="status" data-shown={loadingShown || undefined}>
          <span className={styles.sweep}>Loading requests…</span>
        </p>
      </div>
    );
  } else if (empty) {
    body = (
      <div className={styles.whole}>
        {q ? (
          <EmptyState
            art="search"
            title={`No ${filterLabel} requests match “${query.trim()}”`}
            description="Try a name, a title or an amount."
            action={
              <Button variant="secondary" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : filter === "pending" ? (
          <EmptyState
            art="tray"
            title="All caught up"
            description="New requests show up here when someone needs a decision."
          />
        ) : (
          <EmptyState
            art="tray"
            title={`Nothing ${filterLabel} yet`}
            description={
              filter === "expired"
                ? "Requests land here when their due date passes without a decision."
                : `Requests you’ve ${filterLabel} show here, with who decided and when.`
            }
          />
        )}
      </div>
    );
  } else {
    body = (
      <div className={styles.panes} data-view={narrow ? view : undefined}>
        <div className={styles.listPane}>
          <RequestList
            key={listKey}
            entries={entries}
            listRef={listRef}
            selectedId={selectedId}
            now={now}
            filter={filter}
            failures={failures}
            grouped={grouping === "requester"}
            label={`${FILTERS.find((f) => f.value === filter)?.label} requests`}
            hintId={hintId}
            onOpen={(requestId) => open(requestId)}
          />
        </div>
        <div className={styles.detailPane}>
          {selected ? (
            <Detail
              key={selected.id}
              ref={detailRef}
              request={selected}
              now={now}
              canDecide={canDecide}
              permissionNote={permissionNote}
              expired={selected.status === "pending" && !!selected.expiresAt && toTime(selected.expiresAt) <= now}
              busy={busy[selected.id] ?? null}
              failure={failures[selected.id] ?? null}
              narrow={narrow}
              onBack={back}
              onApprove={(edits) => decide([{ id: selected.id, decision: "approve", edits }])}
              onDecline={(note) => decide([{ id: selected.id, decision: "decline", note }])}
              onRequeue={onRequeue ? () => requeue(selected.id) : undefined}
              onDismissFailure={() =>
                setFailures((f) => {
                  const next = { ...f };
                  delete next[selected.id];
                  return next;
                })
              }
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      aria-labelledby={titleId}
      data-narrow={narrow || undefined}
      onKeyDown={onKeyDown}
    >
      <header className={styles.top}>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.lede}>{description}</p>
        </div>
        {showBulk && (
          <Button ref={bulkButton} variant="secondary" onClick={openBulk}>
            <Icon name="check" />
            Bulk approve
          </Button>
        )}
      </header>

      <div className={styles.toolbar}>
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(v as ApprovalStatus);
            setSelectedId(null);
            setSelectedIndex(0);
            setView("list");
          }}
          className={styles.tabs}
        >
          <TabList aria-label="Show requests">
            {FILTERS.map((f) => (
              <Tab key={f.value} value={f.value} count={f.value === "pending" && !loading && !error ? counts.pending : undefined}>
                {f.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <div className={styles.tools}>
          <SearchField
            label="Search requests"
            placeholder="Search requests"
            shortcut="/"
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
            className={styles.search}
          />
          {/* The search field's height: controls in one row share one height. */}
          <Select
            aria-label="Group requests"
            value={grouping}
            onValueChange={(v) => setGrouping(normalizeGrouping(v as ApprovalGrouping))}
            options={GROUPINGS}
            className={styles.grouping}
          />
        </div>
      </div>

      {!canDecide && !error && (
        <div className={styles.notice}>
          <Alert tone="info" title="You can view these requests, not decide them">
            {permissionNote}
          </Alert>
        </div>
      )}

      {body}

      {!loading && !error && !empty && (
        <p id={hintId} className={styles.hint}>
          <span>
            <Kbd keys={["J"]} size="sm" /> <Kbd keys={["K"]} size="sm" /> move
          </span>
          {canDecide && filter === "pending" && (
            <>
              <span>
                <Kbd keys={["A"]} size="sm" /> approve
              </span>
              <span>
                <Kbd keys={["D"]} size="sm" /> decline
              </span>
              <span>
                <Kbd keys={["E"]} size="sm" /> edit
              </span>
            </>
          )}
          <span>
            <Kbd keys={["/"]} size="sm" /> search
          </span>
        </p>
      )}

      {showBulk || bulkOpen ? (
        <Dialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          triggerRef={bulkButton}
          title="Approve several requests"
          description="Tick the ones you’ve already checked. Anything you leave unticked stays in Pending."
          footer={
            <>
              <Button variant="secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                aria-disabled={bulkPicked.size === 0 || undefined}
                onClick={() => {
                  if (bulkPicked.size === 0) return;
                  setBulkOpen(false);
                  void decide(bulkCandidates.filter((r) => bulkPicked.has(r.id)).map((r) => ({ id: r.id, decision: "approve" })));
                }}
              >
                {bulkPicked.size === 0 ? "Approve selected" : `Approve ${bulkPicked.size} selected`}
              </Button>
            </>
          }
        >
          <div className={styles.bulkAll}>
            <Checkbox
              label="Select all"
              description={plural(bulkCandidates.length, "pending request")}
              checked={allPicked && bulkPicked.size > 0}
              indeterminate={bulkPicked.size > 0 && !allPicked}
              onCheckedChange={(checked) => setBulkPicked(new Set(checked && !allPicked ? bulkCandidates.map((r) => r.id) : []))}
            />
          </div>
          <ul className={styles.bulkList}>
            {bulkCandidates.map((r) => (
              <li key={r.id}>
                <Checkbox
                  label={r.title}
                  description={[requesterOf(r).name, r.context].filter(Boolean).join(" · ")}
                  checked={bulkPicked.has(r.id)}
                  onCheckedChange={(checked) =>
                    setBulkPicked((p) => {
                      const next = new Set(p);
                      if (checked) next.add(r.id);
                      else next.delete(r.id);
                      return next;
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </Dialog>
      ) : null}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </section>
  );
}

/* ---------- The list ---------- */

function RequestList({
  entries,
  listRef,
  selectedId,
  now,
  filter,
  failures,
  grouped,
  label,
  hintId,
  onOpen,
}: {
  entries: Entry[];
  listRef: RefObject<HTMLUListElement | null>;
  selectedId: string | null;
  now: number;
  filter: ApprovalStatus;
  failures: Record<string, string>;
  /** Grouped by requester: the heading names them, so rows don't. */
  grouped: boolean;
  label: string;
  hintId: string;
  onOpen: (id: string) => void;
}) {
  const { rows, done } = usePresence(entries);
  const tabbable = selectedId && rows.some((r) => r.item.id === selectedId && !r.leaving) ? selectedId : rows.find((r) => r.item.kind === "row")?.item.id;

  return (
    <ul ref={listRef} className={styles.list} aria-label={label} aria-describedby={hintId}>
      {rows.map(({ item, leaving, arrived }) => (
        <Row key={item.id} id={item.id} leaving={leaving} arrived={arrived} onGone={done} group={item.kind === "group"}>
          {item.kind === "group" ? (
            <div className={styles.groupHead}>
              {item.requester && <Avatar name={item.requester.name} src={item.requester.avatarUrl} size={20} decorative />}
              <h3 className={styles.groupTitle}>{item.label}</h3>
              {item.requester?.detail && <span className={styles.groupRole}>{item.requester.detail}</span>}
              <span className={styles.groupCount}>{item.count}</span>
            </div>
          ) : (
            <RowButton
              request={item.request}
              selected={item.id === selectedId}
              tabbable={item.id === tabbable}
              now={now}
              filter={filter}
              failed={!!failures[item.id]}
              grouped={grouped}
              onOpen={onOpen}
            />
          )}
        </Row>
      ))}
    </ul>
  );
}

/** Opens and closes through grid-template-rows, so the list never jumps. */
function Row({
  id,
  leaving,
  arrived,
  group,
  onGone,
  children,
}: {
  id: string;
  leaving: boolean;
  arrived: boolean;
  group: boolean;
  onGone: (id: string) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!leaving) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => onGone(id), reduce ? 150 : 600);
    return () => window.clearTimeout(timer);
  }, [leaving, onGone, id]);
  return (
    <li className={styles.row} data-group={group || undefined} data-leaving={leaving || undefined} data-arrived={arrived || undefined} inert={leaving || undefined}>
      <div className={styles.rowClip}>{children}</div>
    </li>
  );
}

function RowButton({
  request: r,
  selected,
  tabbable,
  now,
  filter,
  failed,
  grouped,
  onOpen,
}: {
  request: ApprovalRequest;
  selected: boolean;
  tabbable: boolean;
  now: number;
  filter: ApprovalStatus;
  failed: boolean;
  grouped: boolean;
  onOpen: (id: string) => void;
}) {
  const who = requesterOf(r);
  const priority = priorityOf(r);
  const expiresAt = r.status === "pending" && filter === "pending" && r.expiresAt ? toTime(r.expiresAt) : null;
  let side: ReactNode;
  if (expiresAt !== null && expiresAt - now < HOUR) {
    // Only the last hour ticks; before that, a quiet date.
    side = <Countdown expiresAt={expiresAt} now={now} />;
  } else {
    const text = expiresAt !== null ? dueLabel(expiresAt, now) : when(filter === "pending" ? toTime(r.requestedAt) : settledAt(r), now);
    side = (
      <span className={styles.rowTime} suppressHydrationWarning>
        {text}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={styles.rowButton}
      data-row-id={r.id}
      aria-current={selected || undefined}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onOpen(r.id)}
    >
      <span className={styles.rowAvatar}>
        <Avatar name={who.name} src={who.avatarUrl} size={32} decorative />
      </span>
      <span className={styles.rowTitle}>{r.title}</span>
      <span className={styles.rowSide}>
        {priority === "high" && <PriorityBadge priority={priority} short />}
        {side}
      </span>
      <span className={styles.rowMeta}>
        {failed ? (
          <span className={styles.rowFailed}>
            <Icon name="alert" />
            Didn’t go through
          </span>
        ) : (
          <>
            {(grouped && r.context ? [r.context] : [who.name, r.context]).filter(Boolean).join(" · ")}
          </>
        )}
      </span>
    </button>
  );
}
