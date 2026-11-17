"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Select } from "@registry/select/select";
import { Switch } from "@registry/switch/switch";
import { TeamMembers, type TeamInvite, type TeamMember } from "@registry/team-members/team-members";
import base from "./preview.module.css";
import styles from "./team-members.module.css";

type View = "admin" | "owner" | "viewer" | "full" | "alone" | "loading" | "error";

const VIEWS: { value: View; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "14 members, 3 invites, 3 seats left" },
  { value: "owner", label: "Only owner", description: "You’re the one owner: Leave is blocked" },
  { value: "viewer", label: "Viewer", description: "Read-only, with the reason" },
  { value: "full", label: "Seats full", description: "Every seat taken; invites ask to upgrade" },
  { value: "alone", label: "Just you", description: "A new workspace" },
  { value: "loading", label: "Loading", description: "First load, slow network" },
  { value: "error", label: "Error", description: "Members couldn’t load" },
];

const WORKSPACE = "Hearth & Hare";
const ME = "m-sam";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Built from the moment the preview renders, so "3 hours ago" stays true. */
function seed(now: number) {
  const members: TeamMember[] = [
    { id: "m-ines", name: "Ines Duarte", email: "ines@hearthandhare.co", role: "owner", lastActiveAt: now - 2 * MIN },
    { id: "m-ada", name: "Ada Okafor", email: "ada@hearthandhare.co", role: "owner", lastActiveAt: now - 2 * HOUR },
    { id: ME, name: "Sam Whitaker", email: "sam@hearthandhare.co", role: "admin", lastActiveAt: now },
    { id: "m-theo", name: "Theo Marchetti", email: "theo@hearthandhare.co", role: "admin", lastActiveAt: now - 26 * HOUR },
    { id: "m-priya", name: "Priya Raghunathan", email: "priya.r@hearthandhare.co", role: "member", lastActiveAt: now - 3 * HOUR },
    { id: "m-meilin", name: "Mei-Lin Chen", email: "meilin@hearthandhare.co", role: "member", lastActiveAt: now - 34 * MIN },
    { id: "m-grace", name: "Grace O’Connell", email: "grace.oconnell@fastmail.com", role: "member", lastActiveAt: now - 5 * HOUR },
    { id: "m-olu", name: "Olu Bankole", email: "olu@bankolefoods.ng", role: "member", lastActiveAt: now - 30 * HOUR },
    { id: "m-jonas", name: "Jonas Lindqvist", email: "jonas.lindqvist@proton.me", role: "member", lastActiveAt: now - 4 * DAY },
    {
      id: "m-lucia",
      name: "Lucía Fernández de la Vega Montenegro",
      email: "lucia.fernandezdelavega@cocinaabierta.es",
      role: "member",
      lastActiveAt: now - 6 * DAY,
    },
    { id: "m-kwame", name: "Kwame Asante-Boateng", email: "kwame@asanteboateng.com", role: "member", lastActiveAt: now - 16 * DAY },
    { id: "m-hannah", name: "Hannah Becker", email: "hannah.becker@gmail.com", role: "viewer", lastActiveAt: now - 34 * DAY },
    { id: "m-tomas", name: "Tomás Ibarra", email: "tomas@ibarrawines.com", role: "viewer", lastActiveAt: now - 12 * DAY },
    { id: "m-rafael", name: "Rafael Souza", email: "rafa.souza@outlook.com", role: "viewer", lastActiveAt: null },
  ];
  const invites: TeamInvite[] = [
    {
      id: "i-bea",
      email: "bea.lindgren@hearthandhare.co",
      role: "member",
      sentAt: now - 3 * HOUR,
      expiresAt: now - 3 * HOUR + 7 * DAY,
      invitedBy: "Ada Okafor",
    },
    {
      id: "i-noor",
      email: "noor.haddad@fastmail.com",
      role: "member",
      sentAt: now - 2 * DAY,
      expiresAt: now - 2 * DAY + 7 * DAY,
      invitedBy: "Ines Duarte",
    },
    {
      id: "i-felix",
      email: "felix@saltandember.com",
      role: "viewer",
      sentAt: now - 9 * DAY,
      expiresAt: now - 2 * DAY,
      invitedBy: "Sam Whitaker",
    },
  ];
  return { members, invites };
}

function setup(view: View, now: number) {
  const { members, invites } = seed(now);
  switch (view) {
    case "owner":
      // Sam is the only owner here.
      return {
        members: members
          .filter((m) => m.id !== "m-ines")
          .map((m) => (m.id === ME ? { ...m, role: "owner" } : m.id === "m-ada" ? { ...m, role: "admin" } : m)),
        invites,
        total: 20,
      };
    case "viewer":
      return { members: members.map((m) => (m.id === ME ? { ...m, role: "viewer" } : m)), invites, total: 20 };
    case "full":
      return { members, invites, total: 17 };
    case "alone":
      return { members: members.filter((m) => m.id === ME).map((m) => ({ ...m, role: "owner" })), invites: [], total: 5 };
    default:
      return { members, invites, total: 20 };
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function TeamMembersPreview() {
  const [view, setView] = useState<View>("admin");
  const [data, setData] = useState(() => setup("admin", Date.now()));
  const [loading, setLoading] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [left, setLeft] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const theoFailed = useRef(false);
  const failRef = useRef(failNext);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  function show(next: View) {
    setView(next);
    setLeft(false);
    setUpgraded(false);
    theoFailed.current = false;
    setData(setup(next, Date.now()));
    setLoading(next === "loading");
  }

  // The loading view settles after a slow network's worth of waiting.
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 2600);
    return () => window.clearTimeout(t);
  }, [loading]);

  /** A fake request: 0.6 to 1.2s, failing when asked to. */
  async function request(fail = false, reason?: string) {
    await wait(600 + Math.random() * 600);
    if (fail || failRef.current) {
      setFailNext(false);
      throw new Error(reason ?? "");
    }
  }

  const { members, invites, total } = data;
  const seats = { used: members.length + invites.length, total };

  if (left) {
    return (
      <div className={base.stack}>
        <div className={styles.left}>
          <p className={styles.leftTitle}>You left {WORKSPACE}</p>
          <p className={base.note}>In your app, this is where Acme takes you back to your other workspaces.</p>
          <Button variant="secondary" onClick={() => show(view)}>
            Reset the preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={base.stack}>
      <div className={styles.controls} data-demo-controls="">
        <Select
          aria-label="Preview state"
          value={view}
          onValueChange={(v) => show(v as View)}
          options={VIEWS}
        />
        <Switch
          label="Fail the next request"
          checked={failNext}
          onCheckedChange={(checked) => setFailNext(checked)}
        />
      </div>

      <div className={styles.page}>
        <TeamMembers
          workspaceName={WORKSPACE}
          members={view === "error" ? [] : members}
          invites={invites}
          currentUserId={ME}
          seats={seats}
          canManage={view !== "viewer"}
          loading={loading}
          error={view === "error" ? "Acme didn’t answer in time. Your team is fine; this page just couldn’t load it." : null}
          onRetry={() => {
            setView("admin");
            setData(setup("admin", Date.now()));
            setLoading(true);
          }}
          onInvite={async (emails, role) => {
            await request(false, "Acme couldn’t send the invites. Nothing was sent; try again.");
            const now = Date.now();
            setData((d) => ({
              ...d,
              invites: [
                ...emails.map((email, i) => ({
                  id: `i-${now}-${i}`,
                  email,
                  role,
                  sentAt: now,
                  expiresAt: now + 7 * DAY,
                  invitedBy: "Sam Whitaker",
                })),
                ...d.invites,
              ],
            }));
          }}
          onChangeRole={async (id, role) => {
            // Theo's first change fails, so the rollback can be seen.
            const theo = id === "m-theo" && !theoFailed.current;
            if (theo) theoFailed.current = true;
            await request(theo);
            setData((d) => ({ ...d, members: d.members.map((m) => (m.id === id ? { ...m, role } : m)) }));
          }}
          onRemove={async (id) => {
            await request(false, "Acme couldn’t remove them just now. They still have access; try again.");
            if (id === ME) {
              setLeft(true);
              return;
            }
            setData((d) => ({ ...d, members: d.members.filter((m) => m.id !== id) }));
          }}
          onResend={async (id) => {
            await request();
            const now = Date.now();
            setData((d) => ({
              ...d,
              invites: d.invites.map((i) => (i.id === id ? { ...i, sentAt: now, expiresAt: now + 7 * DAY } : i)),
            }));
          }}
          onRevoke={async (id) => {
            await request();
            setData((d) => ({ ...d, invites: d.invites.filter((i) => i.id !== id) }));
          }}
          onUpgrade={() => {
            setUpgraded(true);
            setData((d) => ({ ...d, total: d.total + 10 }));
          }}
        />
      </div>

      <p className={base.note} aria-live="polite">
        {upgraded
          ? "Upgraded: 10 more seats. In your app, onUpgrade opens billing."
          : "Paste a list into Invite people: bad and duplicate addresses are caught before sending. Theo’s first role change fails and rolls back."}
      </p>
    </div>
  );
}
