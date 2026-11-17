"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Button } from "../button/button";
import { Drawer } from "../drawer/drawer";
import { DropdownMenu, MenuItem, MenuSeparator } from "../dropdown-menu/dropdown-menu";
import { Icon } from "../icons/icons";
import { Kbd } from "../kbd/kbd";
import { NavRailTooltipGroup, NavRailTrigger } from "../nav-rail/nav-rail";
import { ScrollArea } from "../scroll-area/scroll-area";
import { SkeletonGroup, SkeletonText } from "../skeleton/skeleton";
import { flyPill, stopPill } from "../tabs/pill-flight";
import { Tooltip } from "../tooltip/tooltip";
import styles from "./sidebar.module.css";

/* Behavior comes from Base UI through the kit: the menus are Dropdown menu,
   the phone drawer is Drawer, the collapsed rail's one tooltip is Nav rail's.
   This file keeps the layout, the collapse, the pill and the recent list. */

/** Below this width the sidebar leaves the layout and opens as a drawer. Keep in sync with the CSS. */
export const SIDEBAR_DRAWER_QUERY = "(max-width: 767px)";

export type SidebarItem = {
  id: string;
  /** The item's name: its text, its accessible name and the collapsed rail's tooltip. */
  label: string;
  /** A 16px icon drawn in `currentColor`. Primary items need one: it's all the collapsed rail shows. */
  icon?: ReactNode;
  /** Renders a link instead of a button. */
  href?: string;
  /** An unread count. 0 or undefined hides it. */
  badge?: number;
  /** One key pressed with ⌘ or Ctrl, like `"K"`. Shown on hover and in the tooltip; handled when `shortcuts` is on. */
  shortcut?: string;
  /** A word or two at the row's end, read after the label: a teammate's status ("Away"), a state. */
  detail?: string;
};

/** An item in a section; with `items` it's a group that opens to show them, one level deep. */
export type SidebarSectionItem = SidebarItem & {
  items?: SidebarItem[];
  /** A group starts open. */
  defaultOpen?: boolean;
};

export type SidebarSection = {
  id: string;
  /** The small heading. Without one the items follow straight on. */
  label?: string;
  items: SidebarSectionItem[];
  /** The heading folds the section away. */
  collapsible?: boolean;
  /** A collapsible section starts open; true by default. */
  defaultOpen?: boolean;
};

export type SidebarRecentItem = {
  id: string;
  title: string;
  href?: string;
  /** Pinned items list above the rest, under their own heading. */
  pinned?: boolean;
  /** Quiet detail at the row's end: a relative time ("2h"), a small avatar group. The "…" takes its place while it shows. */
  meta?: ReactNode;
};

export type SidebarRecent = {
  /** Heading of the list; "Recent" by default. */
  label?: string;
  /** Heading of the pinned items; "Pinned" by default. */
  pinnedLabel?: string;
  items: SidebarRecentItem[];
  /** Holds the list's place with skeleton rows, after 300ms. */
  loading?: boolean;
  /** Announced while loading: "Loading chats…". */
  loadingLabel?: string;
  /** What shows with no items: one quiet line or two. */
  empty?: ReactNode;
  /** Rename in place. Return a promise to show saving; reject with a message to show it. */
  onRename?: (id: string, title: string) => void | Promise<unknown>;
  onPinnedChange?: (id: string, pinned: boolean) => void;
  /** Delete at once; ask first or offer Undo yourself. */
  onDelete?: (id: string) => void;
  /** A link (or button) after the list, to the full history. */
  showAll?: { label?: string; href?: string; onClick?: () => void };
};

/* ---------- State ---------- */

type SidebarState = {
  /** The sidebar element's id, for the toggle's aria-controls. */
  id: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  /** Below the breakpoint: the sidebar is a drawer. */
  mobile: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Collapse or expand; on a phone, open or close the drawer. */
  toggle: () => void;
  shortcut: string | false;
};

const StateContext = createContext<SidebarState | null>(null);

/** The sidebar's state, for your own toggle or layout. Inside a `SidebarProvider`. */
export function useSidebar() {
  const state = use(StateContext);
  if (!state) throw new Error("useSidebar must be inside <SidebarProvider>.");
  return state;
}

function subscribeQuery(onChange: () => void) {
  const query = matchMedia(SIDEBAR_DRAWER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type SidebarProviderProps = {
  /** Controlled: the sidebar is an icon rail. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The key pressed with ⌘ or Ctrl to collapse and expand: `"b"` by default; `false` turns it off. */
  shortcut?: string | false;
  children: ReactNode;
};

/** Holds the collapsed state, so a `SidebarToggle` outside the sidebar (in the page's header) can reach it. */
export function SidebarProvider({
  collapsed: controlled,
  defaultCollapsed = false,
  onCollapsedChange,
  shortcut = "b",
  children,
}: SidebarProviderProps) {
  const id = `${useId()}-sidebar`;
  const [inner, setInner] = useState(defaultCollapsed);
  const collapsed = controlled ?? inner;
  const mobile = useSyncExternalStore(
    subscribeQuery,
    () => matchMedia(SIDEBAR_DRAWER_QUERY).matches,
    () => false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Leaving the phone layout closes the drawer, so it can't reappear later.
  if (!mobile && drawerOpen) setDrawerOpen(false);

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setInner(next);
      onCollapsedChange?.(next);
    },
    [controlled, onCollapsedChange],
  );

  const toggle = useCallback(() => {
    if (mobile) setDrawerOpen((open) => !open);
    else setCollapsed(!collapsed);
  }, [mobile, collapsed, setCollapsed]);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      // A rich text editor that uses the same keys (bold) prevents the default first.
      if (e.defaultPrevented || e.repeat || e.altKey || e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== shortcut.toLowerCase()) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, toggle]);

  const value = useMemo(
    () => ({ id, collapsed, setCollapsed, mobile, drawerOpen, setDrawerOpen, toggle, shortcut }),
    [id, collapsed, setCollapsed, mobile, drawerOpen, toggle, shortcut],
  );
  return <StateContext value={value}>{children}</StateContext>;
}

/** A `dir` attribute changing anywhere above the sidebar. */
function subscribeDirection(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"], subtree: true });
  return () => observer.disconnect();
}

/* What the header and footer buttons need to know about where they sit. */
type Slot = { collapsed: boolean; rtl: boolean; drawer: boolean };
const SlotContext = createContext<Slot>({ collapsed: false, rtl: false, drawer: false });

/* ---------- Sidebar ---------- */

type SidebarProps = {
  /** Names the `nav` landmark: "Main" by default. */
  "aria-label"?: string;
  /** The top: usually a `SidebarSwitcher`. On a phone it's the drawer's title. */
  header?: ReactNode;
  /** The bottom: usually a `SidebarAccount`. */
  footer?: ReactNode;
  /** The primary items, pinned under the header. They stay in the collapsed rail. */
  items: SidebarItem[];
  /** Headed groups of items below them; hidden in the collapsed rail. */
  sections?: SidebarSection[];
  /** A recent list, like chat history, after the sections. */
  recent?: SidebarRecent;
  /** The id of the current item, section item or recent item. */
  value?: string;
  /** Called with an id when an item is pressed (or its shortcut is). */
  onValueChange?: (id: string) => void;
  /** Handle ⌘ or Ctrl plus each item's `shortcut` anywhere on the page. */
  shortcuts?: boolean;
  className?: string;
};

/** The app sidebar: a switcher, items, sections, a recent list and an account; collapses to an icon rail, and is a drawer on phones. */
export function Sidebar(props: SidebarProps) {
  const state = use(StateContext);
  if (!state)
    return (
      <SidebarProvider>
        <SidebarFrame {...props} />
      </SidebarProvider>
    );
  return <SidebarFrame {...props} />;
}

function SidebarFrame({
  "aria-label": label = "Main",
  header,
  footer,
  items,
  sections = [],
  recent,
  value,
  onValueChange,
  shortcuts = false,
  className,
}: SidebarProps) {
  const state = useSidebar();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  // The direction can change with the page around it; menus open toward the content.
  const rtl = useSyncExternalStore(
    subscribeDirection,
    () => (root ? getComputedStyle(root).direction === "rtl" : false),
    () => false,
  );

  const { mobile, setDrawerOpen } = state;
  const select = useCallback(
    (id: string) => {
      onValueChange?.(id);
      if (mobile) setDrawerOpen(false);
    },
    [onValueChange, mobile, setDrawerOpen],
  );

  // ⌘ or Ctrl plus a shortcut presses that item, so a link navigates and a button selects.
  useEffect(() => {
    if (!shortcuts) return;
    const all = [...items, ...sections.flatMap((s) => s.items.flatMap((i) => [i, ...(i.items ?? [])]))];
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const item = all.find((i) => i.shortcut && i.shortcut.toLowerCase() === e.key.toLowerCase());
      if (!item) return;
      e.preventDefault();
      const el = document.querySelector<HTMLElement>(
        `[data-sidebar-id="${state.id}"] [data-id="${CSS.escape(item.id)}"]`,
      );
      if (el) el.click();
      else select(item.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, items, sections, select, state.id]);

  const collapsed = !mobile && state.collapsed;

  const nav = (
    <SidebarNav
      label={label}
      items={items}
      sections={sections}
      recent={recent}
      value={value}
      onSelect={select}
      collapsed={collapsed}
      drawer={mobile}
    />
  );

  // Menus and the rail's tooltip portal out of the sidebar; this gives them its direction.
  const direction = rtl ? "rtl" : "ltr";

  if (mobile) {
    return (
      <DirectionProvider direction={direction}>
        {/* Nothing else of the sidebar is in the page here; this reads its direction. */}
        <span ref={setRoot} hidden />
        <SlotContext value={{ collapsed: false, rtl, drawer: true }}>
          <NavRailTooltipGroup>
            {/* The drawer portals out of the page, so its parts carry the direction. */}
            <Drawer
              open={state.drawerOpen}
              onOpenChange={setDrawerOpen}
              side="start"
              size="sm"
              title={
                <span dir={direction} data-rtl={rtl || undefined}>
                  {header ?? label}
                </span>
              }
              footer={
                footer ? (
                  <div className={styles.drawerFooter} dir={direction} data-rtl={rtl || undefined}>
                    {footer}
                  </div>
                ) : undefined
              }
              className={`${styles.vars} ${styles.drawer}`}
            >
              <div data-sidebar-id={state.id} dir={direction} data-rtl={rtl || undefined}>
                {nav}
              </div>
            </Drawer>
          </NavRailTooltipGroup>
        </SlotContext>
      </DirectionProvider>
    );
  }

  return (
    <div
      ref={setRoot}
      id={state.id}
      data-sidebar-id={state.id}
      data-collapsed={collapsed || undefined}
      data-rtl={rtl || undefined}
      className={className ? `${styles.vars} ${styles.sidebar} ${className}` : `${styles.vars} ${styles.sidebar}`}
    >
      <DirectionProvider direction={direction}>
        <NavRailTooltipGroup root={root}>
          <SlotContext value={{ collapsed, rtl, drawer: false }}>
            {header && <div className={styles.header}>{header}</div>}
            {nav}
            {footer && <div className={styles.footer}>{footer}</div>}
          </SlotContext>
        </NavRailTooltipGroup>
      </DirectionProvider>
    </div>
  );
}

/* ---------- Nav ---------- */

type NavProps = {
  label: string;
  items: SidebarItem[];
  sections: SidebarSection[];
  recent?: SidebarRecent;
  value?: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  drawer: boolean;
};

const ITEM = "[data-sidebar-item]";

function usable(el: Element) {
  return el.getClientRects().length > 0 && !el.closest("[inert]");
}

/** Inside its scroll region's visible box, so a pill flying there isn't drawn over the fade. */
function inView(el: Element) {
  const viewport = el.closest("[data-sidebar-scroll]")?.firstElementChild;
  if (!viewport) return true;
  const box = el.getBoundingClientRect();
  const view = viewport.getBoundingClientRect();
  return box.top >= view.top && box.bottom <= view.bottom;
}

/**
 * The current row paints its own flat pill. When the current item changes,
 * one pill flies from the old row to the new one, as Tabs' does, then hands
 * back. Rows of different widths, hidden rows and reduced motion just switch.
 */
function usePillFlight(
  navRef: RefObject<HTMLElement | null>,
  pillRef: RefObject<HTMLSpanElement | null>,
  value?: string,
) {
  const previous = useRef(value);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    const from = previous.current;
    previous.current = value;
    if (!nav || !pill || !from || !value || from === value) return;
    const find = (id: string) => nav.querySelector<HTMLElement>(`[data-pill][data-id="${CSS.escape(id)}"]`);
    const a = find(from);
    const b = find(value);
    const land = () => nav.removeAttribute("data-flying");
    if (!a || !b || !usable(a) || !usable(b) || !inView(a) || !inView(b)) {
      stopPill(pill, true);
      land();
      return;
    }
    const origin = nav.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.left - rb.left) > 1 || Math.abs(ra.width - rb.width) > 1) {
      stopPill(pill, true);
      land();
      return;
    }
    const start = stopPill(pill, true) ?? { start: ra.top - origin.top, length: ra.height };
    const to = { start: rb.top - origin.top, length: rb.height };
    pill.style.left = `${rb.left - origin.left}px`;
    pill.style.width = `${rb.width}px`;
    pill.style.height = `${rb.height}px`;
    pill.style.transform = `translate(0px, ${to.start}px)`;
    nav.setAttribute("data-flying", "");
    flyPill(pill, start, to, true);
    const flight = pill.getAnimations()[0];
    if (!flight) return land();
    // A newer flight cancels this one, which rejects; that flight lands itself.
    flight.finished.then(land, () => {});
  }, [navRef, pillRef, value]);
}

function SidebarNav({ label, items, sections, recent, value, onSelect, collapsed, drawer }: NavProps) {
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  usePillFlight(navRef, pillRef, value);

  // Up and Down, Home and End move between rows; Tab still visits every control.
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    const all = [...e.currentTarget.querySelectorAll<HTMLElement>(ITEM)].filter(usable);
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    e.preventDefault();
    const to =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? all.length - 1
          : Math.min(Math.max(at + (e.key === "ArrowDown" ? 1 : -1), 0), all.length - 1);
    all[to]?.focus();
  }

  const hasMore = sections.length > 0 || recent;
  const more = hasMore && (
    <>
      {sections.map((section) => (
        <Section key={section.id} section={section} value={value} onSelect={onSelect} />
      ))}
      {recent && <Recent recent={recent} value={value} onSelect={onSelect} />}
    </>
  );

  return (
    <nav ref={navRef} aria-label={label} className={styles.nav} onKeyDown={onKeyDown}>
      <span ref={pillRef} className={styles.pill} aria-hidden="true" />
      <ul className={styles.primary}>
        {items.map((item) => (
          <li key={item.id} className={styles.cell}>
            <ItemRow item={item} current={item.id === value} onSelect={onSelect} tooltip={collapsed} />
          </li>
        ))}
      </ul>
      {hasMore &&
        (drawer ? (
          <div className={styles.more}>{more}</div>
        ) : (
          <div className={styles.scrollWrap} inert={collapsed} data-sidebar-scroll="">
            <ScrollArea className={styles.scroll}>
              <div className={styles.more}>{more}</div>
            </ScrollArea>
          </div>
        ))}
    </nav>
  );
}

/* ---------- Rows ---------- */

type ItemRowProps = {
  item: SidebarItem;
  current: boolean;
  onSelect: (id: string) => void;
  /** Collapsed: the rail's tooltip names it. */
  tooltip?: boolean;
  nested?: boolean;
};

function ItemRow({ item, current, onSelect, tooltip = false, nested = false }: ItemRowProps) {
  const count = item.badge && item.badge > 0 ? item.badge : 0;
  const shown = count > 99 ? "99+" : String(count);
  const props = {
    className: styles.row,
    "data-sidebar-item": "",
    "data-pill": "",
    "data-id": item.id,
    "data-nested": nested || undefined,
    "data-current": current || undefined,
    "aria-current": current ? ("page" as const) : undefined,
    "aria-label": count || item.detail ? [item.label, item.detail, count ? `${count} new` : ""].filter(Boolean).join(", ") : undefined,
    "aria-keyshortcuts": item.shortcut ? `Meta+${item.shortcut} Control+${item.shortcut}` : undefined,
    onClick: () => onSelect(item.id),
  };
  const body = (
    <>
      {item.icon && (
        <span className={styles.icon} aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className={styles.label}>{item.label}</span>
      {(item.shortcut || item.detail || count > 0) && (
        <span className={styles.trailing} aria-hidden="true">
          {item.detail && <span className={styles.detail}>{item.detail}</span>}
          {item.shortcut && <Kbd className={styles.kbd} keys={["mod", item.shortcut]} variant="plain" size="sm" />}
          {count > 0 && <span className={styles.count}>{shown}</span>}
        </span>
      )}
      {count > 0 && (
        <span className={styles.corner} aria-hidden="true">
          {shown}
        </span>
      )}
    </>
  );
  return (
    <NavRailTrigger label={item.label} shortcut={item.shortcut} disabled={!tooltip}>
      {item.href ? (
        <a href={item.href} {...props}>
          {body}
        </a>
      ) : (
        <button type="button" {...props}>
          {body}
        </button>
      )}
    </NavRailTrigger>
  );
}

/** Opens and closes on height: grid rows 0fr → 1fr, its content inert while closed. */
function Fold({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div className={styles.fold} data-open={open || undefined} inert={!open}>
      <div id={id} className={styles.foldInner}>
        {children}
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  // Content opens below the row, so it points down and turns up. It morphs; it never spins.
  return <Icon name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />;
}

function GroupRow({
  item,
  value,
  onSelect,
}: {
  item: SidebarSectionItem;
  value?: string;
  onSelect: (id: string) => void;
}) {
  const children = item.items ?? [];
  const [open, setOpen] = useState(item.defaultOpen ?? children.some((c) => c.id === value));
  const listId = `${useId()}-items`;
  return (
    <>
      <button
        type="button"
        className={styles.row}
        data-sidebar-item=""
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        {item.icon && (
          <span className={styles.icon} aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className={styles.label}>{item.label}</span>
        <Chevron open={open} />
      </button>
      <Fold open={open}>
        <ul id={listId} className={styles.list}>
          {children.map((child) => (
            <li key={child.id} className={styles.cell}>
              <ItemRow item={child} current={child.id === value} onSelect={onSelect} nested />
            </li>
          ))}
        </ul>
      </Fold>
    </>
  );
}

function Section({
  section,
  value,
  onSelect,
}: {
  section: SidebarSection;
  value?: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(section.defaultOpen ?? true);
  const id = useId();
  const headingId = `${id}-heading`;
  const listId = `${id}-list`;
  const list = (
    <ul id={listId} className={styles.list}>
      {section.items.map((item) => (
        <li key={item.id} className={styles.cell}>
          {item.items?.length ? (
            <GroupRow item={item} value={value} onSelect={onSelect} />
          ) : (
            <ItemRow item={item} current={item.id === value} onSelect={onSelect} />
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <section className={styles.section} aria-labelledby={section.label ? headingId : undefined}>
      {section.label && (
        <h2 id={headingId} className={styles.heading}>
          {section.collapsible ? (
            <button
              type="button"
              className={styles.headingButton}
              data-sidebar-item=""
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen(!open)}
            >
              <span className={styles.headingLabel}>{section.label}</span>
              <Chevron open={open} />
            </button>
          ) : (
            <span className={styles.headingText}>{section.label}</span>
          )}
        </h2>
      )}
      {section.collapsible ? <Fold open={open}>{list}</Fold> : list}
    </section>
  );
}

/* ---------- Recent ---------- */

type RowState = "in" | "enter" | "leave";
type Row = { item: SidebarRecentItem; state: RowState };

/** Removed items stay a moment to fade and fold; new ones open in. */
function merge(previous: Row[], items: SidebarRecentItem[]): Row[] {
  const was = new Map(previous.filter((r) => r.state !== "leave").map((r) => [r.item.id, r.state]));
  const ids = new Set(items.map((i) => i.id));
  const next: Row[] = items.map((item) => {
    const state = was.get(item.id);
    return { item, state: state === undefined ? "enter" : state === "enter" ? "enter" : "in" };
  });
  previous.forEach((row, i) => {
    if (ids.has(row.item.id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = next.findIndex((n) => n.item.id === previous[j].item.id);
      if (k !== -1) {
        at = k + 1;
        break;
      }
    }
    next.splice(at, 0, { item: row.item, state: "leave" });
  });
  return next;
}

/** The fade (120ms) then the fold (200ms), with a little room. */
const LEAVE_MS = 360;

function useRows(items: SidebarRecentItem[]) {
  const [rows, setRows] = useState<Row[]>(() => items.map((item) => ({ item, state: "in" })));
  const [last, setLast] = useState(items);
  if (items !== last) {
    setLast(items);
    setRows(merge(rows, items));
  }
  const leaving = rows.some((r) => r.state === "leave");
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setRows((all) => all.filter((r) => r.state !== "leave")), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, rows]);
  return rows;
}

function PinGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.25 2.75h5.5M6.5 2.75v3.5l-2 3h7l-2-3v-3.5M8 9.25v4" />
    </svg>
  );
}

function Recent({
  recent,
  value,
  onSelect,
}: {
  recent: SidebarRecent;
  value?: string;
  onSelect: (id: string) => void;
}) {
  const { items, loading = false } = recent;
  const pinned = useMemo(() => items.filter((i) => i.pinned), [items]);
  const rest = useMemo(() => items.filter((i) => !i.pinned), [items]);
  const [editing, setEditing] = useState<string | null>(null);
  const label = recent.label ?? "Recent";

  const skeleton = (
    <div className={styles.skeleton}>
      {["72%", "54%", "80%", "46%", "64%"].map((width, i) => (
        <div key={i} className={styles.skeletonRow}>
          <SkeletonText size="sm" width={width} />
        </div>
      ))}
    </div>
  );

  const group = (heading: string, list: SidebarRecentItem[], always: boolean) => (
    <RecentGroup
      key={heading}
      heading={heading}
      items={list}
      always={always}
      recent={recent}
      value={value}
      editing={editing}
      setEditing={setEditing}
      onSelect={onSelect}
    />
  );

  return (
    <>
      {!loading && pinned.length > 0 && group(recent.pinnedLabel ?? "Pinned", pinned, false)}
      <section className={styles.section} aria-label={loading || items.length === 0 ? label : undefined}>
        {(loading || items.length === 0) && (
          <h2 className={styles.heading}>
            <span className={styles.headingText}>{label}</span>
          </h2>
        )}
        <SkeletonGroup loading={loading} fallback={skeleton} label={recent.loadingLabel ?? "Loading…"}>
          {items.length === 0 ? (
            <div className={styles.empty}>{recent.empty ?? <p className={styles.emptyTitle}>Nothing here yet</p>}</div>
          ) : (
            group(label, rest, true)
          )}
        </SkeletonGroup>
      </section>
    </>
  );
}

type RecentGroupProps = {
  heading: string;
  items: SidebarRecentItem[];
  /** Keep the group (and Show all) when every item is pinned. */
  always: boolean;
  recent: SidebarRecent;
  value?: string;
  editing: string | null;
  setEditing: (id: string | null) => void;
  onSelect: (id: string) => void;
};

function RecentGroup({ heading, items, always, recent, value, editing, setEditing, onSelect }: RecentGroupProps) {
  const rows = useRows(items);
  const headingId = `${useId()}-heading`;
  const listRef = useRef<HTMLUListElement>(null);
  if (!always && rows.length === 0) return null;
  const { showAll } = recent;

  // Focus moves to the next chat (or the one before) once the menu has let go.
  function remove(id: string) {
    const list = listRef.current;
    const lis = list ? [...list.querySelectorAll<HTMLElement>(":scope > li:not([data-state='leave'])")] : [];
    const at = lis.findIndex((li) => li.dataset.id === id);
    const target = (lis[at + 1] ?? lis[at - 1])?.querySelector<HTMLElement>(ITEM);
    recent.onDelete?.(id);
    window.setTimeout(() => {
      if (target?.isConnected) target.focus();
      else list?.closest("nav")?.querySelector<HTMLElement>(ITEM)?.focus();
    }, 180);
  }

  const inner = (
    <>
      <h2 id={headingId} className={styles.heading}>
        <span className={styles.headingText}>{heading}</span>
      </h2>
      {rows.length > 0 && (
        <ul ref={listRef} className={styles.list}>
          {rows.map(({ item, state }) => (
            <RecentRow
              key={item.id}
              item={item}
              state={state}
              current={item.id === value}
              editing={editing === item.id}
              recent={recent}
              onSelect={onSelect}
              onStartRename={() => setEditing(item.id)}
              onEndRename={() => setEditing(null)}
              onDelete={() => remove(item.id)}
            />
          ))}
        </ul>
      )}
      {always &&
        showAll &&
        (showAll.href ? (
          <a className={styles.showAll} href={showAll.href} onClick={showAll.onClick} data-sidebar-item="">
            {showAll.label ?? "Show all"}
          </a>
        ) : (
          <button type="button" className={styles.showAll} onClick={showAll.onClick} data-sidebar-item="">
            {showAll.label ?? "Show all"}
          </button>
        ))}
    </>
  );

  return always ? (
    <div className={styles.section}>{inner}</div>
  ) : (
    <section className={styles.section} aria-labelledby={headingId}>
      {inner}
    </section>
  );
}

type RecentRowProps = {
  item: SidebarRecentItem;
  state: RowState;
  current: boolean;
  editing: boolean;
  recent: SidebarRecent;
  onSelect: (id: string) => void;
  onStartRename: () => void;
  onEndRename: () => void;
  onDelete: () => void;
};

function RecentRow({
  item,
  state,
  current,
  editing,
  recent,
  onSelect,
  onStartRename,
  onEndRename,
  onDelete,
}: RecentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rowRef = useRef<HTMLElement>(null);
  const { onRename, onPinnedChange, onDelete: canDelete } = recent;
  const actions = Boolean(onRename || onPinnedChange || canDelete);
  const props = {
    className: styles.row,
    "data-kind": "recent",
    "data-sidebar-item": "",
    "data-pill": "",
    "data-id": item.id,
    "data-current": current || undefined,
    "aria-current": current ? ("page" as const) : undefined,
    // The title may be cut; the whole of it is here too.
    title: item.title,
    onClick: () => onSelect(item.id),
  };
  // Titles are people's own words, in any script: each takes its own direction.
  const title = (
    <>
      <span className={styles.recentTitle} dir="auto">
        {item.title}
      </span>
      {item.meta && <span className={styles.recentMeta}>{item.meta}</span>}
    </>
  );

  return (
    <li
      className={styles.recentItem}
      data-id={item.id}
      data-state={state === "in" ? undefined : state}
      data-menu-open={menuOpen || undefined}
      data-actions={actions || undefined}
      data-meta={item.meta ? true : undefined}
      inert={state === "leave"}
    >
      <div className={styles.recentInner}>
        {editing && onRename ? (
          <RenameField
            initial={item.title}
            onCommit={(next) => onRename(item.id, next)}
            onDone={(refocus) => {
              onEndRename();
              if (refocus) requestAnimationFrame(() => rowRef.current?.focus());
            }}
          />
        ) : (
          <>
            {item.href ? (
              <a ref={rowRef as RefObject<HTMLAnchorElement>} href={item.href} {...props}>
                {title}
              </a>
            ) : (
              <button ref={rowRef as RefObject<HTMLButtonElement>} type="button" {...props}>
                {title}
              </button>
            )}
            {actions && (
              <DropdownMenu
                align="end"
                open={menuOpen}
                onOpenChange={setMenuOpen}
                trigger={
                  <button type="button" className={styles.moreButton} aria-label={`Actions for ${item.title}`}>
                    <Icon name="more" />
                  </button>
                }
              >
                {onRename && (
                  <MenuItem icon={<Icon name="pencil" />} onSelect={onStartRename}>
                    Rename
                  </MenuItem>
                )}
                {onPinnedChange && (
                  <MenuItem icon={<PinGlyph />} onSelect={() => onPinnedChange(item.id, !item.pinned)}>
                    {item.pinned ? "Unpin" : "Pin"}
                  </MenuItem>
                )}
                {canDelete && (
                  <>
                    {(onRename || onPinnedChange) && <MenuSeparator />}
                    <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={onDelete}>
                      Delete
                    </MenuItem>
                  </>
                )}
              </DropdownMenu>
            )}
          </>
        )}
      </div>
    </li>
  );
}

type RenameFieldProps = {
  initial: string;
  onCommit: (title: string) => void | Promise<unknown>;
  /** `refocus`: the field had focus, so hand it back to the row. */
  onDone: (refocus: boolean) => void;
};

/** The row's title, editable where it sits. Enter or leaving saves, Escape cancels. */
function RenameField({ initial, onCommit, onDone }: RenameFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = `${useId()}-error`;
  const done = useRef(false);

  // The menu hands focus back to its trigger as it closes; take it after that.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function finish(refocus: boolean) {
    if (done.current) return;
    done.current = true;
    onDone(refocus);
  }

  async function commit(refocus: boolean) {
    if (busy || done.current) return;
    const next = draft.trim();
    if (!next) {
      setError("Enter a name");
      inputRef.current?.focus();
      return;
    }
    if (next === initial) return finish(refocus);
    let result: void | Promise<unknown>;
    try {
      result = onCommit(next);
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "Couldn’t rename. Try again.");
      return;
    }
    if (!(result instanceof Promise)) return finish(refocus);
    setBusy(true);
    setError(null);
    try {
      await result;
      finish(refocus);
    } catch (reason) {
      setBusy(false);
      setError(
        typeof reason === "string" && reason
          ? reason
          : reason instanceof Error && reason.message
            ? reason.message
            : "Couldn’t rename. Try again.",
      );
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      void commit(true);
    } else if (event.key === "Escape") {
      // Kept here, so a drawer around the list stays open.
      event.preventDefault();
      event.stopPropagation();
      if (!busy) finish(true);
    }
  }

  return (
    <div className={styles.rename}>
      <input
        ref={inputRef}
        className={busy ? `${styles.renameInput} ${styles.renameBusy}` : styles.renameInput}
        value={draft}
        dir="auto"
        maxLength={120}
        aria-label="Name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-busy={busy || undefined}
        readOnly={busy}
        enterKeyHint="done"
        onChange={(e) => {
          setDraft(e.currentTarget.value);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!error) void commit(false);
        }}
      />
      {error && (
        <p id={errorId} className={styles.renameError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Header and footer ---------- */

type MenuButtonProps = {
  /** The 24px mark or avatar at the start; it's what the collapsed rail shows. */
  media: ReactNode;
  name: string;
  /** A second line: a plan, an email. */
  detail?: string;
  /** Menu items: `MenuItem`, `MenuRadioGroup`, `MenuSeparator`… */
  children: ReactNode;
  kind: "switcher" | "account";
};

function MenuButton({ media, name, detail, children, kind }: MenuButtonProps) {
  const slot = use(SlotContext);
  const [open, setOpen] = useState(false);
  const below = kind === "switcher";
  // Collapsed, the menu opens beside the rail, toward the content.
  const side = slot.collapsed ? (slot.rtl ? "left" : "right") : below ? "bottom" : "top";
  // The chevron points where the menu opens, and turns as it does.
  const pointsDown = below ? !open : open;
  return (
    <DropdownMenu
      side={side}
      align={slot.collapsed && !below ? "end" : "start"}
      open={open}
      onOpenChange={setOpen}
      className={styles.menu}
      trigger={
        <NavRailTrigger label={name} disabled={!slot.collapsed}>
          <button type="button" className={styles.menuButton} data-kind={kind}>
            <span className={styles.media} data-kind={kind} aria-hidden="true">
              {media}
            </span>
            <span className={styles.menuText}>
              <span className={styles.menuName} dir="auto" title={name}>
                {name}
              </span>
              {detail && (
                <span className={styles.menuDetail} dir="auto">
                  {detail}
                </span>
              )}
            </span>
            <Icon name={pointsDown ? "chevron-down" : "chevron-up"} className={styles.chevron} />
          </button>
        </NavRailTrigger>
      }
    >
      {children}
    </DropdownMenu>
  );
}

type SidebarSwitcherProps = {
  /** The workspace or app mark, drawn on a round ink tile. */
  mark: ReactNode;
  name: string;
  detail?: string;
  /** Menu items: the workspaces as a `MenuRadioGroup`, then settings. */
  children: ReactNode;
};

/** The header's workspace or app switcher: mark, name and a chevron, opening a menu. */
export function SidebarSwitcher({ mark, name, detail, children }: SidebarSwitcherProps) {
  return (
    <MenuButton kind="switcher" media={<span className={styles.mark}>{mark}</span>} name={name} detail={detail}>
      {children}
    </MenuButton>
  );
}

type SidebarAccountProps = {
  /** A 24px `Avatar`, decorative: the name is written beside it. */
  avatar: ReactNode;
  name: string;
  /** The plan or email under the name. */
  detail?: string;
  /** Menu items: settings, help, log out. */
  children: ReactNode;
};

/** The footer's account row: avatar, name and plan, opening a menu above it. */
export function SidebarAccount({ avatar, name, detail, children }: SidebarAccountProps) {
  return (
    <MenuButton kind="account" media={avatar} name={name} detail={detail}>
      {children}
    </MenuButton>
  );
}

/** Collapses and expands the sidebar, or opens it on a phone. Put it in the page's header or the sidebar's. */
export function SidebarToggle({ className }: { className?: string }) {
  const state = useSidebar();
  const label = state.mobile ? "Open sidebar" : state.collapsed ? "Expand sidebar" : "Collapse sidebar";
  const key = state.shortcut ? state.shortcut.toUpperCase() : null;
  return (
    <Tooltip
      describe={false}
      content={
        <span className={styles.tip}>
          {label}
          {key && <Kbd className={styles.tipKbd} keys={["mod", key]} variant="plain" size="sm" />}
        </span>
      }
    >
      <Button
        variant="ghost"
        size="sm"
        className={className}
        aria-label={label}
        aria-expanded={state.mobile ? state.drawerOpen : !state.collapsed}
        aria-controls={state.mobile ? undefined : state.id}
        aria-haspopup={state.mobile ? "dialog" : undefined}
        aria-keyshortcuts={key ? `Meta+${key} Control+${key}` : undefined}
        onClick={state.toggle}
      >
        <Icon name="sidebar" />
      </Button>
    </Tooltip>
  );
}
