"use client";

import { useState, type ReactNode } from "react";
import {
  Sidebar,
  SidebarAccount,
  SidebarProvider,
  SidebarSwitcher,
  SidebarToggle,
  useSidebar,
  type SidebarItem,
  type SidebarRecentItem,
  type SidebarSection,
} from "@registry/sidebar/sidebar";
import { AcmeBrand, StarMark } from "@/components/logo";
import { Avatar } from "@registry/avatar/avatar";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Icon } from "@registry/icons/icons";
import { Kbd } from "@registry/kbd/kbd";
import { MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@registry/dropdown-menu/dropdown-menu";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { Select } from "@registry/select/select";
import styles from "./sidebar.module.css";

/* Glyphs the icon set doesn't have, drawn on its 16-unit grid. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      {children}
    </svg>
  );
}

const COMPOSE = (
  <Glyph>
    <path d="M13.25 8.75v3a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5h3" />
    <path d="M11.35 2.65a1.35 1.35 0 0 1 1.9 1.9L8.6 9.2l-2.35.55.55-2.35Z" />
  </Glyph>
);

const AGENT = (
  <Glyph>
    <rect x="2.75" y="5" width="10.5" height="8.25" rx="2.5" />
    <path d="M8 5V2.75M6 9h.01M10 9h.01" />
  </Glyph>
);

const BOOK = (
  <Glyph>
    <path d="M2.75 3.25h3.5A1.75 1.75 0 0 1 8 5v8.25a1.5 1.5 0 0 0-1.5-1.5H2.75Z" />
    <path d="M13.25 3.25h-3.5A1.75 1.75 0 0 0 8 5v8.25a1.5 1.5 0 0 1 1.5-1.5h3.75Z" />
  </Glyph>
);

const BOLT = (
  <Glyph>
    <path d="M9 2.25 3.75 9.25h4l-.75 4.5 5.25-7h-4Z" />
  </Glyph>
);

const FOLDER = (
  <Glyph>
    <path d="M2.75 4.5A1.25 1.25 0 0 1 4 3.25h2.5l1.5 1.5h4a1.25 1.25 0 0 1 1.25 1.25v5.5A1.25 1.25 0 0 1 12 12.75H4a1.25 1.25 0 0 1-1.25-1.25Z" />
  </Glyph>
);

const CHATS: SidebarRecentItem[] = [
  { id: "c1", title: "Q3 churn by plan, with the April price change marked" },
  { id: "c2", title: "Reply to Northwind about SSO setup" },
  { id: "c3", title: "Summarize the pricing page interviews" },
  { id: "c4", title: "Why did Tuesday’s CSV import fail?" },
  { id: "c5", title: "SQL for weekly active teams" },
  { id: "c6", title: "Release notes for 4.2" },
  { id: "c7", title: "Onboarding emails, second draft" },
  { id: "c8", title: "Compare vector databases for support search" },
  { id: "c9", title: "Translate the refunds article into German" },
  { id: "c10", title: "Board update outline" },
  { id: "c11", title: "Rewrite the billing error messages" },
  { id: "c12", title: "Interview questions for the design role" },
  { id: "c13", title: "Expense policy in plain words" },
];

type Page = { title: string; note: string; rows?: [string, string][] };

const PAGES: Record<string, Page> = {
  new: { title: "New chat", note: "Ask a question, or drop in a file to start." },
  search: { title: "Search", note: "Chats, files and agents across Acme." },
  agents: {
    title: "Agents",
    note: "Four agents, two running now.",
    rows: [
      ["Support triage", "Running"],
      ["Weekly metrics", "Mondays at 9:00"],
      ["Release notes", "Idle"],
    ],
  },
  knowledge: {
    title: "Knowledge",
    note: "What the agents answer from. 214 documents.",
    rows: [
      ["Help center", "182 articles"],
      ["Pricing and plans.pdf", "Updated today"],
      ["Security overview", "Updated Oct 30"],
    ],
  },
  automations: {
    title: "Automations",
    note: "Three runs need a look.",
    rows: [
      ["Tag new tickets", "Failed at step 2"],
      ["Sync Stripe refunds", "Waiting for approval"],
      ["Nightly churn report", "Waiting for approval"],
    ],
  },
  launch: { title: "Website relaunch", note: "Project · 12 chats, 8 files" },
  checklist: { title: "Launch checklist", note: "Website relaunch · 9 of 14 done" },
  copy: { title: "Homepage copy", note: "Website relaunch · Draft 3" },
  assistant: { title: "Support assistant", note: "Project · 31 chats, 4 files" },
  planning: { title: "Q4 planning", note: "Project · 6 chats, 2 files" },
};

const ITEMS: SidebarItem[] = [
  { id: "new", label: "New chat", icon: COMPOSE },
  { id: "search", label: "Search", icon: <Icon name="search" />, shortcut: "K" },
  { id: "agents", label: "Agents", icon: AGENT },
  { id: "knowledge", label: "Knowledge", icon: BOOK },
  { id: "automations", label: "Automations", icon: BOLT, badge: 3 },
];

const SECTIONS: SidebarSection[] = [
  {
    id: "projects",
    label: "Projects",
    collapsible: true,
    items: [
      {
        id: "launch-group",
        label: "Website relaunch",
        icon: FOLDER,
        items: [
          { id: "checklist", label: "Launch checklist" },
          { id: "copy", label: "Homepage copy" },
        ],
      },
      { id: "assistant", label: "Support assistant", icon: FOLDER },
      { id: "planning", label: "Q4 planning", icon: FOLDER },
    ],
  },
];

const WORKSPACES = [
  { value: "acme", label: "Acme" },
  { value: "research", label: "Acme Research Partners, Europe and Asia Pacific" },
];

type RecentState = "chats" | "loading" | "empty";

const RECENT_STATES = [
  { value: "chats", label: "Recent chats" },
  { value: "loading", label: "Loading" },
  { value: "empty", label: "No chats yet" },
];

export function SidebarPreview() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarProvider collapsed={collapsed} onCollapsedChange={setCollapsed}>
      <Demo />
    </SidebarProvider>
  );
}

function Demo() {
  const sidebar = useSidebar();
  const [value, setValue] = useState("c2");
  const [chats, setChats] = useState(CHATS);
  const [recentState, setRecentState] = useState<RecentState>("chats");
  const [workspace, setWorkspace] = useState("acme");
  const [rtl, setRtl] = useState(false);
  const [status, setStatus] = useState("");

  const chat = chats.find((c) => c.id === value);
  const page: Page = chat
    ? { title: chat.title, note: chat.pinned ? "Pinned chat" : "Chat · Today" }
    : (PAGES[value] ?? PAGES.new);
  const workspaceName = WORKSPACES.find((w) => w.value === workspace)!.label;

  function rename(id: string, title: string) {
    // A short save, as over the network.
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        setChats((all) => all.map((c) => (c.id === id ? { ...c, title } : c)));
        setStatus(`Renamed to “${title}”.`);
        resolve();
      }, 500),
    );
  }

  function pin(id: string, pinned: boolean) {
    setChats((all) => all.map((c) => (c.id === id ? { ...c, pinned } : c)));
    const title = chats.find((c) => c.id === id)?.title;
    setStatus(pinned ? `Pinned “${title}”.` : `Unpinned “${title}”.`);
  }

  function remove(id: string) {
    const title = chats.find((c) => c.id === id)?.title;
    setChats((all) => all.filter((c) => c.id !== id));
    if (value === id) setValue("new");
    setStatus(`Deleted “${title}”.`);
  }

  function chooseRecent(next: RecentState) {
    setRecentState(next);
    if (next === "chats" && chats.length === 0) setChats(CHATS);
  }

  const items = recentState === "empty" ? [] : chats;

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        {!sidebar.mobile && (
          <SegmentedControl
            aria-label="Width"
            size="sm"
            widths="content"
            value={sidebar.collapsed ? "rail" : "full"}
            onValueChange={(v) => sidebar.setCollapsed(v === "rail")}
          >
            <Segment value="full">Expanded</Segment>
            <Segment value="rail">Collapsed</Segment>
          </SegmentedControl>
        )}
        <Select
          size="sm"
          aria-label="Recent list"
          options={RECENT_STATES}
          value={recentState}
          onValueChange={(v) => chooseRecent(v as RecentState)}
        />
        <Checkbox label="Right to left" checked={rtl} onCheckedChange={setRtl} />
      </div>

      <div className={styles.frame} dir={rtl ? "rtl" : "ltr"}>
        <Sidebar
          aria-label={workspaceName}
          value={value}
          onValueChange={setValue}
          header={
            <SidebarSwitcher mark={<StarMark />} name={workspaceName}>
              <MenuRadioGroup label="Workspaces" value={workspace} onValueChange={setWorkspace}>
                {WORKSPACES.map((w) => (
                  <MenuRadioItem key={w.value} value={w.value}>
                    {w.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <MenuSeparator />
              <MenuItem icon={<Icon name="plus" />}>Invite people</MenuItem>
              <MenuItem>Workspace settings</MenuItem>
            </SidebarSwitcher>
          }
          items={ITEMS}
          sections={SECTIONS}
          recent={{
            items,
            loading: recentState === "loading",
            loadingLabel: "Loading chats…",
            empty: (
              <>
                <p>No chats yet</p>
                <p>Chats you start show up here.</p>
              </>
            ),
            onRename: rename,
            onPinnedChange: pin,
            onDelete: remove,
            showAll: { label: "All chats", onClick: () => setStatus("All chats would open as a page.") },
          }}
          footer={
            <SidebarAccount avatar={<Avatar name="Ana Ruiz" size={24} decorative />} name="Ana Ruiz" detail="Pro plan">
              <MenuItem>Settings</MenuItem>
              <MenuItem>Keyboard shortcuts</MenuItem>
              <MenuItem>Help</MenuItem>
              <MenuSeparator />
              <MenuItem>Log out</MenuItem>
            </SidebarAccount>
          }
        />
        <section className={styles.main} aria-label={page.title}>
          <header className={styles.bar}>
            <SidebarToggle />
            {sidebar.mobile && <AcmeBrand className={styles.brand} />}
          </header>
          <div key={value} className={styles.page} dir="auto">
            <h2 className={styles.title}>{page.title}</h2>
            <p className={styles.note}>{page.note}</p>
            {page.rows && (
              <ul className={styles.rows}>
                {page.rows.map(([name, meta]) => (
                  <li key={name} className={styles.row}>
                    <span className={styles.rowName}>{name}</span>
                    <span className={styles.rowMeta}>{meta}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <p className={styles.note}>
        {sidebar.mobile ? (
          "Below 768px the sidebar opens as a drawer from the button in the page’s header."
        ) : (
          <>
            <Kbd keys={["mod", "B"]} size="sm" /> folds it to an icon rail and back. Each chat’s “…” renames, pins or
            deletes it.
          </>
        )}
      </p>
      <p className={styles.srOnly} role="status">
        {status}
      </p>
    </div>
  );
}
