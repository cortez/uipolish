"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Alert } from "../alert/alert";
import { Avatar } from "../avatar/avatar";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { ConfirmDialog } from "../dialog/dialog";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { SearchField } from "../search-field/search-field";
import { Select, type SelectOption } from "../select/select";
import { Tooltip } from "../tooltip/tooltip";
import { plural } from "./emails";
import { InviteDialog } from "./invite-dialog";
import styles from "./team-members.module.css";

/* ---------- Types ---------- */

export type TeamRole = {
  value: string;
  label: string;
  /** One line on what the role can do; shown in the role menus. */
  description?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  /** Photo URL; initials show without one. */
  avatarUrl?: string;
  /** A `value` from `roles`. */
  role: string;
  /** When they last used the workspace. `null`: they haven't signed in yet. */
  lastActiveAt?: Date | string | number | null;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: string;
  sentAt: Date | string | number;
  /** Past this, the invite reads as expired and Resend renews it. */
  expiresAt?: Date | string | number;
  /** Who sent it: "Ada Okafor". */
  invitedBy?: string;
};

export type TeamSeats = {
  /** Members plus pending invites. */
  used: number;
  total: number;
};

export type TeamMembersProps = {
  /** In the order to show them. Owners first, then by name, reads best. */
  members: TeamMember[];
  invites?: TeamInvite[];
  /** The signed-in person: their row says "You" and offers Leave instead of Remove. */
  currentUserId: string;
  /** Most powerful first. People can manage rows and hand out roles at or below their own. */
  roles?: TeamRole[];
  /** The role that owns the workspace. There's always at least one. Defaults to the first role. */
  ownerRole?: string;
  /** The role new invites start on. Defaults to "member", or the last role. */
  defaultInviteRole?: string;
  /** Leave out on plans without a seat limit. */
  seats?: TeamSeats;
  /** False for people who can see the team but not change it. */
  canManage: boolean;
  /** Used in sentences: "People who can plan suppers in Acme Kitchen." */
  workspaceName: string;
  /** The line under the title. */
  description?: ReactNode;
  title?: string;
  /** Members are loading for the first time. */
  loading?: boolean;
  /** Members couldn't load: say why. Shown with Retry when `onRetry` is set. */
  error?: string | null;
  onRetry?: () => void;
  /** Resolve once the invites exist and `invites` and `seats` include them. Reject with a message to show it. */
  onInvite?: (emails: string[], role: string) => Promise<unknown>;
  /** The row shows the new role at once and rolls back if this rejects. Update `members` when it resolves. */
  onChangeRole?: (memberId: string, role: string) => Promise<unknown>;
  /** Also called for the current user leaving. Remove the member from `members` when it resolves. */
  onRemove?: (memberId: string) => Promise<unknown>;
  /** Update the invite's `sentAt` (and `expiresAt`) when it resolves. */
  onResend?: (inviteId: string) => Promise<unknown>;
  /** Remove the invite from `invites` when it resolves. */
  onRevoke?: (inviteId: string) => Promise<unknown>;
  /** Shown wherever seats run out. */
  onUpgrade?: () => void;
  upgradeLabel?: string;
  /** Search and the role filter show above this many members. */
  searchThreshold?: number;
  /** Seconds before an invite can be sent again. */
  resendCooldown?: number;
  className?: string;
};

export const DEFAULT_ROLES: TeamRole[] = [
  { value: "owner", label: "Owner", description: "Everything, including billing and deleting the workspace" },
  { value: "admin", label: "Admin", description: "Invite people, change roles and manage settings" },
  { value: "member", label: "Member", description: "Plan suppers, edit menus and message guests" },
  { value: "viewer", label: "Viewer", description: "See suppers and guest lists, but not change them" },
];

/* ---------- Time ---------- */

const toTime = (value: Date | string | number) => new Date(value).getTime();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function dayLabel(time: number, now: number) {
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}

/** "Active now", "3 hours ago", "Yesterday", "Oct 12". */
function ago(time: number, now: number) {
  const diff = Math.max(0, now - time);
  if (diff < 5 * MINUTE) return "just now";
  // Rounded, so a clock a few seconds behind the data never reads "1 hour" for 2.
  if (diff < HOUR - MINUTE / 2) return `${Math.round(diff / MINUTE)} min ago`;
  if (diff < DAY - HOUR / 2) return `${plural(Math.round(diff / HOUR), "hour")} ago`;
  if (diff < 1.5 * DAY) return "yesterday";
  if (diff < 6.5 * DAY) return `${Math.round(diff / DAY)} days ago`;
  return dayLabel(time, now);
}

function lastActive(member: TeamMember, now: number) {
  if (member.lastActiveAt === null) return "Hasn’t signed in";
  if (member.lastActiveAt === undefined) return "";
  const time = toTime(member.lastActiveAt);
  if (now - time < 5 * MINUTE) return "Active now";
  const text = ago(time, now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Presence: removed rows close in place ---------- */

type Shown<T> = { item: T; leaving: boolean; arrived: boolean };

/**
 * Keeps removed items in place, flagged as leaving, until their row has
 * closed; flags items that arrive after the first render.
 */
function usePresence<T extends { id: string }>(items: T[]) {
  const [previous, setPrevious] = useState(items);
  const [leaving, setLeaving] = useState<{ item: T; index: number }[]>([]);
  const [arrived, setArrived] = useState<ReadonlySet<string>>(() => new Set());

  if (previous !== items) {
    setPrevious(items);
    const ids = new Set(items.map((i) => i.id));
    const gone = previous.flatMap((item, index) => (ids.has(item.id) ? [] : [{ item, index }]));
    setLeaving((l) => [...l.filter((x) => !ids.has(x.item.id)), ...gone]);
    const fresh = items.filter((i) => !previous.some((p) => p.id === i.id));
    if (fresh.length) setArrived((a) => new Set([...a, ...fresh.map((i) => i.id)]));
  }

  const done = useCallback((id: string) => setLeaving((l) => l.filter((x) => x.item.id !== id)), []);

  const rows: Shown<T>[] = items.map((item) => ({ item, leaving: false, arrived: arrived.has(item.id) }));
  for (const l of [...leaving].sort((a, b) => a.index - b.index)) {
    rows.splice(Math.min(l.index, rows.length), 0, { item: l.item, leaving: true, arrived: false });
  }
  return { rows, done };
}

/** Drops a leaving row once it has closed; the timer covers reduced motion. */
function useLeave(leaving: boolean, id: string, done: (id: string) => void, rowRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!leaving || !row?.contains(document.activeElement)) return;
    // Focus moves to the next row that stays, or the one before.
    const pick = (step: "nextElementSibling" | "previousElementSibling") => {
      for (let el = row[step]; el; el = el[step]) {
        if (!el.hasAttribute("data-leaving")) return el.querySelector<HTMLElement>("button, input");
      }
      return null;
    };
    (pick("nextElementSibling") ?? pick("previousElementSibling"))?.focus();
  }, [leaving, rowRef]);

  useEffect(() => {
    if (!leaving) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => done(id), reduce ? 0 : 600);
    return () => window.clearTimeout(timer);
  }, [leaving, done, id]);
}

/** An address that breaks after the @ when it can't fit, not at its last letter. */
function Email({ address }: { address: string }) {
  const at = address.indexOf("@");
  if (at < 1) return address;
  return (
    <>
      {address.slice(0, at + 1)}
      <wbr />
      {address.slice(at + 1)}
    </>
  );
}

function message(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

/* ---------- Member row ---------- */

type Failure = { text: string; retry?: () => void };

type MemberRowProps = {
  member: TeamMember;
  roleLabel: string;
  /** What the select shows: the optimistic role while saving. */
  shownRole: string;
  isSelf: boolean;
  /** Null when this person can't change this row's role. */
  roleOptions: SelectOption[] | null;
  /** Remove, Leave, or nothing. */
  action: "remove" | "leave" | "leave-blocked" | null;
  saving: boolean;
  failure: Failure | null;
  leaving: boolean;
  arrived: boolean;
  now: number;
  blockedNoteId: string;
  onRole: (role: string) => void;
  onAction: (trigger: HTMLElement) => void;
  onDismiss: () => void;
  onGone: (id: string) => void;
};

function MemberRow({
  member,
  roleLabel,
  shownRole,
  isSelf,
  roleOptions,
  action,
  saving,
  failure,
  leaving,
  arrived,
  now,
  blockedNoteId,
  onRole,
  onAction,
  onDismiss,
  onGone,
}: MemberRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  useLeave(leaving, member.id, onGone, rowRef);
  const savingShown = useDelayedBusy(saving);
  const active = lastActive(member, now);

  return (
    <li
      ref={rowRef}
      className={styles.row}
      data-row-id={member.id}
      data-leaving={leaving || undefined}
      data-arrived={arrived || undefined}
      data-failed={failure ? true : undefined}
      inert={leaving || undefined}
    >
      <div className={styles.rowClip}>
        <div className={styles.member} data-text-action={action === "leave" || action === "leave-blocked" || undefined}>
          <Avatar name={member.name} src={member.avatarUrl} size={32} decorative className={styles.avatar} />
          <div className={styles.who}>
            <p className={styles.nameLine}>
              <span className={styles.name}>{member.name}</span>
              {isSelf && (
                <Badge size="sm" className={styles.you}>
                  You
                </Badge>
              )}
            </p>
            <p className={styles.email}>
              <Email address={member.email} />
            </p>
          </div>

          <div className={styles.details}>
            <p className={styles.active} data-saving={savingShown || undefined} data-never={member.lastActiveAt === null || undefined}>
              {savingShown ? <span className={styles.sweep}>Saving…</span> : active}
            </p>
            <div className={styles.roleCell}>
              {roleOptions ? (
                <Select
                  size="sm"
                  aria-label={`Role for ${member.name}`}
                  options={roleOptions}
                  value={shownRole}
                  onValueChange={onRole}
                  disabled={saving}
                  className={styles.roleSelect}
                />
              ) : (
                <span className={styles.roleText}>{roleLabel}</span>
              )}
            </div>
          </div>

          <div className={styles.actionCell}>
            {action === "remove" && (
              <Tooltip content="Remove from workspace" describe={false}>
                <Button
                  variant="ghost"
                  aria-label={`Remove ${member.name}`}
                  className={styles.iconButton}
                  onClick={(e) => onAction(e.currentTarget)}
                >
                  <Icon name="trash" />
                </Button>
              </Tooltip>
            )}
            {(action === "leave" || action === "leave-blocked") && (
              <Button
                variant="ghost"
                className={styles.leave}
                aria-disabled={action === "leave-blocked" || undefined}
                aria-describedby={action === "leave-blocked" ? blockedNoteId : undefined}
                onClick={(e) => {
                  if (action === "leave") onAction(e.currentTarget);
                }}
              >
                Leave
              </Button>
            )}
          </div>

          {failure && (
            <div className={styles.failure} role="alert">
              <Icon name="alert" className={styles.failureIcon} />
              <p className={styles.failureText}>{failure.text}</p>
              <div className={styles.failureActions}>
                {failure.retry && (
                  <Button variant="ghost" onClick={failure.retry}>
                    Try again
                  </Button>
                )}
                <Button variant="ghost" aria-label="Dismiss" className={styles.iconButton} onClick={onDismiss}>
                  <Icon name="close" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------- Invite row ---------- */

type InviteRowProps = {
  invite: TeamInvite;
  roleLabel: string;
  now: number;
  canManage: boolean;
  /** Within the resend cooldown. */
  justSent: boolean;
  resending: boolean;
  revoking: boolean;
  failure: Failure | null;
  leaving: boolean;
  arrived: boolean;
  onResend?: () => void;
  onRevoke?: () => void;
  onDismiss: () => void;
  onGone: (id: string) => void;
};

function InviteRow({
  invite,
  roleLabel,
  now,
  canManage,
  justSent,
  resending,
  revoking,
  failure,
  leaving,
  arrived,
  onResend,
  onRevoke,
  onDismiss,
  onGone,
}: InviteRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  useLeave(leaving, invite.id, onGone, rowRef);
  const expired = invite.expiresAt !== undefined && toTime(invite.expiresAt) <= now;
  const sent = toTime(invite.sentAt);
  const when = justSent ? "Sent just now" : expired ? `Expired ${ago(toTime(invite.expiresAt!), now)}` : `Sent ${ago(sent, now)}`;

  return (
    <li
      ref={rowRef}
      className={styles.row}
      data-leaving={leaving || undefined}
      data-arrived={arrived || undefined}
      inert={leaving || undefined}
    >
      <div className={styles.rowClip}>
        <div className={styles.invite}>
          <Avatar name={invite.email} size={32} decorative className={styles.avatar} />
          <div className={styles.who}>
            <p className={styles.nameLine}>
              <span className={styles.name}>
                <Email address={invite.email} />
              </span>
              {expired && !justSent && (
                <Badge size="sm" tone="warning">
                  Expired
                </Badge>
              )}
            </p>
            <p className={styles.email}>
              {roleLabel}
              <span className={styles.sep} aria-hidden="true">
                {" · "}
              </span>
              <span className={styles.srOnly}>, </span>
              {when}
              {invite.invitedBy && !justSent ? ` by ${invite.invitedBy}` : ""}
            </p>
          </div>
          {canManage && (
            <div className={styles.inviteActions}>
              {onResend && (
                <Button
                  variant="secondary"
                  busy={resending}
                  busyLabel="Sending…"
                  aria-disabled={justSent || undefined}
                  className={styles.resend}
                  data-sent={justSent || undefined}
                  aria-label={justSent ? `Invite to ${invite.email} sent` : `Resend invite to ${invite.email}`}
                  onClick={() => {
                    if (!justSent) onResend();
                  }}
                >
                  {justSent ? "Sent" : expired ? "Renew" : "Resend"}
                </Button>
              )}
              {onRevoke && (
                <Tooltip content="Revoke invite" describe={false}>
                  <Button
                    variant="ghost"
                    busy={revoking}
                    aria-label={`Revoke invite to ${invite.email}`}
                    className={styles.iconButton}
                    onClick={onRevoke}
                  >
                    <Icon name="close" />
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
          {failure && (
            <div className={styles.failure} role="alert">
              <Icon name="alert" className={styles.failureIcon} />
              <p className={styles.failureText}>{failure.text}</p>
              <div className={styles.failureActions}>
                {failure.retry && (
                  <Button variant="ghost" onClick={failure.retry}>
                    Try again
                  </Button>
                )}
                <Button variant="ghost" aria-label="Dismiss" className={styles.iconButton} onClick={onDismiss}>
                  <Icon name="close" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------- The section ---------- */

type Confirm =
  | { kind: "remove"; member: TeamMember }
  | { kind: "leave"; member: TeamMember }
  | { kind: "role"; member: TeamMember; role: string };

const ALL = "all";

/** A workspace's people: members and their roles, invites, and seats. Drops into a settings page. */
export function TeamMembers({
  members,
  invites = [],
  currentUserId,
  roles = DEFAULT_ROLES,
  ownerRole,
  defaultInviteRole,
  seats,
  canManage,
  workspaceName,
  description,
  title = "Members",
  loading = false,
  error = null,
  onRetry,
  onInvite,
  onChangeRole,
  onRemove,
  onResend,
  onRevoke,
  onUpgrade,
  upgradeLabel = "Upgrade plan",
  searchThreshold = 8,
  resendCooldown = 60,
  className,
}: TeamMembersProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const invitesTitleId = `${id}-invites`;
  const blockedNoteId = `${id}-blocked`;
  const owner = ownerRole ?? roles[0]?.value ?? "owner";
  const inviteRole =
    defaultInviteRole ?? (roles.some((r) => r.value === "member") ? "member" : (roles[roles.length - 1]?.value ?? ""));

  // A clock for "3 hours ago" and the resend cooldown; ticks once a minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE);
    return () => window.clearInterval(timer);
  }, []);

  const rank = useCallback(
    (role: string) => {
      const i = roles.findIndex((r) => r.value === role);
      return i === -1 ? roles.length : i;
    },
    [roles],
  );
  const labelOf = (role: string) => roles.find((r) => r.value === role)?.label ?? role;

  const me = members.find((m) => m.id === currentUserId);
  const myRank = me ? rank(me.role) : roles.length;

  /* Per-row work: optimistic roles, failures, busy invites. */
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});
  const [failures, setFailures] = useState<Record<string, Failure>>({});
  const [busyInvites, setBusyInvites] = useState<Record<string, "resend" | "revoke">>({});
  const [cooling, setCooling] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState("");

  const roleOf = (m: TeamMember) => optimistic[m.id] ?? m.role;
  const owners = members.filter((m) => roleOf(m) === owner);
  const lastOwner = owners.length === 1 ? owners[0] : null;

  /* Search and filter */
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL);
  const searchable = members.length > searchThreshold;
  const q = searchable ? query.trim().toLowerCase() : "";
  const filter = searchable ? roleFilter : ALL;
  const matches = (m: TeamMember) =>
    (filter === ALL || roleOf(m) === filter) &&
    (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));

  const memberPresence = usePresence(members);
  const invitePresence = usePresence(invites);
  const visible = memberPresence.rows.filter((r) => r.leaving || matches(r.item));
  const matchCount = members.filter(matches).length;
  const filtered = q !== "" || filter !== ALL;

  /* Seats */
  const seatsLeft = seats ? Math.max(0, seats.total - seats.used) : null;

  /* Roles each row can take */
  function optionsFor(m: TeamMember): SelectOption[] | null {
    if (!canManage || !onChangeRole) return null;
    // Nobody changes a role above their own.
    if (rank(m.role) < myRank) return null;
    const isLastOwner = lastOwner?.id === m.id;
    return roles.map((r) => {
      let note: string | undefined = r.description;
      let disabled = false;
      if (rank(r.value) < myRank) {
        disabled = true;
        note = `Only ${labelOf(roles[rank(r.value)]?.value ?? owner).toLowerCase()}s can give this role`;
      } else if (isLastOwner && r.value !== owner) {
        disabled = true;
        note = "Make someone else an owner first";
      }
      return { value: r.value, label: r.label, description: note, disabled };
    });
  }

  function actionFor(m: TeamMember): MemberRowProps["action"] {
    if (m.id === currentUserId) {
      // Alone in the workspace, there's no one to hand it to.
      if (!onRemove || members.length <= 1) return null;
      return lastOwner?.id === m.id ? "leave-blocked" : "leave";
    }
    if (!canManage || !onRemove || rank(m.role) < myRank) return null;
    return "remove";
  }

  const clearFailure = useCallback((key: string) => {
    setFailures((f) => {
      if (!(key in f)) return f;
      const next = { ...f };
      delete next[key];
      return next;
    });
  }, []);

  /* Role change: shown at once, rolled back if it fails. */
  async function changeRole(m: TeamMember, role: string) {
    if (!onChangeRole) return;
    clearFailure(m.id);
    setOptimistic((o) => ({ ...o, [m.id]: role }));
    try {
      await onChangeRole(m.id, role);
      setAnnouncement(`${m.name} is now ${article(labelOf(role))}.`);
    } catch (reason) {
      const text = message(
        reason,
        `Couldn’t make ${firstName(m.name)} ${article(labelOf(role))}. ${m.id === currentUserId ? "You’re" : `${firstName(m.name)} is`} still ${article(labelOf(m.role))}.`,
      );
      setFailures((f) => ({ ...f, [m.id]: { text, retry: () => changeRole(m, role) } }));
    } finally {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[m.id];
        return next;
      });
    }
  }

  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTrigger = useRef<HTMLElement | null>(null);
  // Where focus lands when the confirm closes: the trigger, unless its row is going.
  const confirmFinal = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function requestRole(m: TeamMember, role: string) {
    if (role === roleOf(m)) return;
    const self = m.id === currentUserId;
    // Handing over ownership, or stepping down yourself, asks first.
    if ((role === owner && m.role !== owner) || (self && rank(role) > rank(m.role))) {
      confirmTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      confirmFinal.current = null;
      setConfirm({ kind: "role", member: m, role });
      setConfirmOpen(true);
      return;
    }
    void changeRole(m, role);
  }

  function requestRemove(m: TeamMember, trigger: HTMLElement) {
    clearFailure(m.id);
    confirmTrigger.current = trigger;
    confirmFinal.current = null;
    setConfirm({ kind: m.id === currentUserId ? "leave" : "remove", member: m });
    setConfirmOpen(true);
  }

  async function runConfirm() {
    if (!confirm) return;
    if (confirm.kind === "role") {
      // The change is optimistic; the dialog can close right away.
      void changeRole(confirm.member, confirm.role);
      return;
    }
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(confirm.member.id)}"]`);
    await onRemove?.(confirm.member.id);
    // The row is closing: send focus to the next person, or the one before.
    const pick = (step: "nextElementSibling" | "previousElementSibling") => {
      for (let el = row?.[step]; el; el = el[step]) {
        if (!el.hasAttribute("data-leaving")) return el.querySelector<HTMLElement>("button");
      }
      return null;
    };
    confirmFinal.current = pick("nextElementSibling") ?? pick("previousElementSibling");
    setAnnouncement(confirm.kind === "leave" ? `You left ${workspaceName}.` : `${confirm.member.name} removed.`);
  }

  /* Invites */
  async function resend(invite: TeamInvite) {
    if (!onResend) return;
    clearFailure(invite.id);
    setBusyInvites((b) => ({ ...b, [invite.id]: "resend" }));
    try {
      await onResend(invite.id);
      startCooldown(invite.id);
      setAnnouncement(`Invite sent to ${invite.email} again.`);
    } catch (reason) {
      setFailures((f) => ({
        ...f,
        [invite.id]: { text: message(reason, `Couldn’t resend to ${invite.email}. Try again in a moment.`), retry: () => resend(invite) },
      }));
    } finally {
      setBusyInvites((b) => {
        const next = { ...b };
        delete next[invite.id];
        return next;
      });
    }
  }

  async function revoke(invite: TeamInvite) {
    if (!onRevoke) return;
    clearFailure(invite.id);
    setBusyInvites((b) => ({ ...b, [invite.id]: "revoke" }));
    try {
      await onRevoke(invite.id);
      setAnnouncement(`Invite to ${invite.email} revoked.`);
    } catch (reason) {
      setFailures((f) => ({
        ...f,
        [invite.id]: { text: message(reason, `Couldn’t revoke the invite to ${invite.email}. It still works.`), retry: () => revoke(invite) },
      }));
    } finally {
      setBusyInvites((b) => {
        const next = { ...b };
        delete next[invite.id];
        return next;
      });
    }
  }

  // Each resend starts a cooldown that ends on its own timer.
  const cooldownMs = resendCooldown * 1000;
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((t) => window.clearTimeout(t));
  }, []);
  function startCooldown(inviteId: string) {
    setCooling((c) => new Set(c).add(inviteId));
    window.clearTimeout(timers.current.get(inviteId));
    timers.current.set(
      inviteId,
      window.setTimeout(() => {
        timers.current.delete(inviteId);
        setCooling((c) => {
          const next = new Set(c);
          next.delete(inviteId);
          return next;
        });
      }, cooldownMs),
    );
  }

  /* Invite dialog */
  const [inviting, setInviting] = useState(false);
  const inviteButton = useRef<HTMLButtonElement>(null);
  const taken = useMemo(
    () => ({
      members: new Set(members.map((m) => m.email.toLowerCase())),
      invited: new Set(invites.map((i) => i.email.toLowerCase())),
    }),
    [members, invites],
  );
  const inviteRoleOptions: SelectOption[] = roles.map((r) => ({
    value: r.value,
    label: r.label,
    description: rank(r.value) < myRank ? `Only ${labelOf(owner).toLowerCase()}s can invite ${r.label.toLowerCase()}s` : r.description,
    disabled: rank(r.value) < myRank,
  }));
  const startRole = rank(inviteRole) < myRank ? (roles[myRank]?.value ?? inviteRole) : inviteRole;

  const ownerNames = members.filter((m) => m.role === owner && m.id !== currentUserId).map((m) => m.name);
  const canInvite = canManage && Boolean(onInvite);

  /* ---------- Render ---------- */

  const header = (
    <header className={styles.header}>
      <div className={styles.heading}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.lede}>{description ?? `People who can plan suppers in ${workspaceName}.`}</p>
      </div>
      {!loading && !error && (canInvite || seats) && (
        <div className={styles.headerSide}>
          {seats && (
            <p className={styles.seats} data-full={seatsLeft === 0 || undefined}>
              <span className={styles.seatCount}>
                {seats.used} of {seats.total} seats used
              </span>
              {seatsLeft === 0 ? (
                onUpgrade ? (
                  <>
                    <span className={styles.sep} aria-hidden="true">
                      ·
                    </span>
                    <button type="button" className={styles.textButton} onClick={onUpgrade}>
                      Get more seats
                    </button>
                  </>
                ) : null
              ) : (
                <span className={styles.seatLeft}>
                  <span className={styles.sep} aria-hidden="true">
                    ·
                  </span>
                  {seatsLeft} left
                </span>
              )}
            </p>
          )}
          {canInvite && (
            <Button ref={inviteButton} onClick={() => setInviting(true)}>
              <Icon name="plus" />
              Invite people
            </Button>
          )}
        </div>
      )}
    </header>
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <div className={styles.card} data-placeholder="">
        <p className={styles.loading} role="status">
          <span className={styles.sweep}>Loading members…</span>
        </p>
      </div>
    );
  } else if (error) {
    body = (
      <div className={styles.card} data-placeholder="">
        <EmptyState
          art="unplugged"
          title="Couldn’t load members"
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
  } else {
    const alone = members.length <= 1;
    body = (
      <>
        {!canManage && (
          <Alert tone="info" title="You can see who’s here, but not change it">
            Only owners and admins can invite people, change roles or remove members.
            {ownerNames.length > 0 ? ` Ask ${joinNames(ownerNames.slice(0, 2))} if something needs changing.` : ""}
          </Alert>
        )}

        {searchable && (
          <div className={styles.toolbar}>
            <SearchField
              label="Search members"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              className={styles.search}
            />
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={[
                { value: ALL, label: "All roles" },
                ...roles.map((r) => ({
                  value: r.value,
                  label: `${r.label}s`,
                  description: plural(members.filter((m) => roleOf(m) === r.value).length, "person", "people"),
                })),
              ]}
              className={styles.filter}
            />
            <p className={styles.count} aria-live="polite">
              {filtered ? `${matchCount} of ${members.length}` : plural(members.length, "member")}
            </p>
          </div>
        )}

        <div className={styles.card}>
          {filtered && matchCount === 0 ? (
            <EmptyState
              art="search"
              title={q ? `No one matches “${query.trim()}”` : `No ${labelOf(filter).toLowerCase()}s`}
              description={
                q && filter !== ALL ? `Searched ${labelOf(filter).toLowerCase()}s only.` : "Try a name, or part of an email address."
              }
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter(ALL);
                  }}
                >
                  Show everyone
                </Button>
              }
            />
          ) : (
            <ul ref={listRef} className={styles.list} aria-labelledby={titleId}>
              {visible.map(({ item: m, leaving, arrived }) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  roleLabel={labelOf(roleOf(m))}
                  shownRole={roleOf(m)}
                  isSelf={m.id === currentUserId}
                  roleOptions={optionsFor(m)}
                  action={actionFor(m)}
                  saving={m.id in optimistic}
                  failure={failures[m.id] ?? null}
                  leaving={leaving}
                  arrived={arrived}
                  now={now}
                  blockedNoteId={blockedNoteId}
                  onRole={(role) => requestRole(m, role)}
                  onAction={(trigger) => requestRemove(m, trigger)}
                  onDismiss={() => clearFailure(m.id)}
                  onGone={memberPresence.done}
                />
              ))}
            </ul>
          )}
          {alone && !filtered && (
            <div className={styles.alone}>
              <p className={styles.aloneTitle}>It’s just you so far</p>
              <p className={styles.aloneText}>
                {canInvite
                  ? "Invite your co-hosts and kitchen crew. They’ll get an email with a link to join."
                  : "When an admin invites people, they’ll show up here."}
              </p>
              {canInvite && (
                <Button variant="secondary" onClick={() => setInviting(true)}>
                  Invite people
                </Button>
              )}
            </div>
          )}
        </div>

        {lastOwner?.id === currentUserId && onRemove && members.length > 1 && (
          <p id={blockedNoteId} className={styles.footnote}>
            You’re the only owner. To leave {workspaceName}, make someone else an owner first.
          </p>
        )}
      </>
    );
  }

  return (
    <section className={className ? `${styles.root} ${className}` : styles.root} aria-labelledby={titleId}>
      {header}
      <div className={styles.body}>{body}</div>

      {!loading && !error && invitePresence.rows.length > 0 && (
        <section className={styles.invites} aria-labelledby={invitesTitleId}>
          <div className={styles.subHead}>
            <h3 id={invitesTitleId} className={styles.subTitle}>
              Pending invites
            </h3>
            <Badge count={invites.length} size="sm" label={`${plural(invites.length, "invite")} waiting`} />
          </div>
          <div className={styles.card}>
            <ul className={styles.list} aria-labelledby={invitesTitleId}>
              {invitePresence.rows.map(({ item: inv, leaving, arrived }) => (
                <InviteRow
                  key={inv.id}
                  invite={inv}
                  roleLabel={labelOf(inv.role)}
                  now={now}
                  canManage={canManage}
                  justSent={cooling.has(inv.id) || now - toTime(inv.sentAt) < cooldownMs}
                  resending={busyInvites[inv.id] === "resend"}
                  revoking={busyInvites[inv.id] === "revoke"}
                  failure={failures[inv.id] ?? null}
                  leaving={leaving}
                  arrived={arrived}
                  onResend={onResend && (() => resend(inv))}
                  onRevoke={onRevoke && (() => revoke(inv))}
                  onDismiss={() => clearFailure(inv.id)}
                  onGone={invitePresence.done}
                />
              ))}
            </ul>
          </div>
          {!canManage && <p className={styles.footnote}>Invites last 7 days. An admin can resend or revoke them.</p>}
        </section>
      )}

      {canInvite && onInvite && (
        <InviteDialog
          open={inviting}
          onOpenChange={setInviting}
          workspace={workspaceName}
          roleOptions={inviteRoleOptions}
          defaultRole={startRole}
          seatsLeft={seatsLeft}
          taken={taken}
          onInvite={onInvite}
          onUpgrade={onUpgrade}
          upgradeLabel={upgradeLabel}
          onSent={(count, role) =>
            setAnnouncement(`${plural(count, "invite")} sent as ${labelOf(role).toLowerCase()}${count === 1 ? "" : "s"}.`)
          }
          triggerRef={inviteButton}
        />
      )}

      {confirm && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={(next) => {
            setConfirmOpen(next);
            const target = confirmFinal.current;
            if (next || !target) return;
            // The dialog hands focus back to the trigger, which is in the closing
            // row; once it has closed, focus moves on to the next person.
            window.setTimeout(() => {
              const active = document.activeElement;
              if (!active || active === document.body || active.closest("[inert]")) target.focus();
            }, 320);
          }}
          triggerRef={confirmTrigger}
          finalFocus={confirmFinal}
          tone={confirm.kind === "role" ? "default" : "danger"}
          {...confirmCopy(confirm, workspaceName, labelOf, owner)}
          onConfirm={runConfirm}
        />
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </section>
  );
}

function article(label: string) {
  return `${/^[aeiou]/i.test(label) ? "an" : "a"} ${label.toLowerCase()}`;
}

function confirmCopy(confirm: Confirm, workspace: string, labelOf: (role: string) => string, owner: string) {
  const name = confirm.member.name;
  const first = firstName(name);
  if (confirm.kind === "leave") {
    return {
      title: `Leave ${workspace}?`,
      description: `You’ll lose access to its suppers, menus and guest lists straight away. To come back, an admin will need to invite you again.`,
      confirmLabel: "Leave workspace",
    };
  }
  if (confirm.kind === "remove") {
    return {
      title: `Remove ${name}?`,
      description: `${first} will lose access to ${workspace} straight away and their seat frees up. Suppers and notes they made stay. You can invite them again later.`,
      confirmLabel: `Remove ${first}`,
    };
  }
  const role = labelOf(confirm.role);
  if (confirm.role === owner) {
    return {
      title: `Make ${name} an owner?`,
      description: `Owners can manage billing, change anyone’s role, remove anyone, and delete ${workspace}.`,
      confirmLabel: `Make ${first} an owner`,
    };
  }
  return {
    title: `Change your role to ${role}?`,
    description: `You’ll lose access to anything ${article(role)} can’t do, and someone above you will need to change it back.`,
    confirmLabel: `Become ${article(role)}`,
  };
}
