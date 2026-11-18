"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import {
  DropdownMenu,
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
} from "@registry/dropdown-menu/dropdown-menu";
import styles from "./preview.module.css";
import local from "./dropdown-menu.module.css";

type Estimate = {
  id: string;
  address: string;
  client: string;
  labor: number;
  materials: number;
  updated: string;
  status: "Draft" | "Sent" | "Approved";
  currency: string;
  showCosts: boolean;
};

const START: Estimate[] = [
  { id: "EVT-0412", address: "Family reunion", client: "Dana Whitfield", labor: 6200, materials: 3650, updated: "2026-10-21", status: "Sent", currency: "USD", showCosts: false },
  { id: "EVT-0409", address: "Harvest dinner", client: "Marcus Lee", labor: 2900, materials: 1220, updated: "2026-10-18", status: "Approved", currency: "USD", showCosts: false },
  { id: "EVT-0407", address: "Rehearsal dinner", client: "Priya Natarajan", labor: 11400, materials: 6900, updated: "2026-10-12", status: "Draft", currency: "CAD", showCosts: false },
];

const total = (e: Estimate) => e.labor + e.materials;
const format = (n: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

function PathIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke)" }} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  share: "M8 2.5v8M5 5.25L8 2.25l3 3M4.5 7.5h-.75a1.25 1.25 0 0 0-1.25 1.25v3.5a1.25 1.25 0 0 0 1.25 1.25h8.5a1.25 1.25 0 0 0 1.25-1.25v-3.5a1.25 1.25 0 0 0-1.25-1.25h-.75",
  mail: "M2.5 4.75A1.25 1.25 0 0 1 3.75 3.5h8.5a1.25 1.25 0 0 1 1.25 1.25v6.5a1.25 1.25 0 0 1-1.25 1.25h-8.5a1.25 1.25 0 0 1-1.25-1.25zM3 4.5l5 4 5-4",
  invoice: "M4 2.5h8v11l-2-1.25-2 1.25-2-1.25-2 1.25zM6.25 6h3.5M6.25 8.75h3.5",
};

const SORTS = {
  updated: { label: "Date updated", compare: (a: Estimate, b: Estimate) => b.updated.localeCompare(a.updated) },
  client: { label: "Host name", compare: (a: Estimate, b: Estimate) => a.client.localeCompare(b.client) },
  total: { label: "Total", compare: (a: Estimate, b: Estimate) => total(b) - total(a) },
} as const;

export function DropdownMenuPreview() {
  const [rows, setRows] = useState(START);
  const [sort, setSort] = useState<keyof typeof SORTS>("updated");
  const [status, setStatus] = useState("");
  const [undo, setUndo] = useState<{ row: Estimate; index: number } | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const copies = useRef(0);
  // Items that confirm in place: which row's link was just copied (and
  // whether the clipboard took it), and each row's PDF build.
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(null);
  const [pdf, setPdf] = useState<Record<string, "busy" | "done">>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  async function copyLink(row: Estimate) {
    const url = `https://example.com/e/${row.id.toLowerCase()}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // No clipboard access (an insecure page, a denied permission): say so
      // in place rather than pretending.
    }
    setCopied({ id: row.id, ok });
    setStatus(ok ? `Copied the link to ${row.address}` : "Couldn’t copy the link. Your browser blocked the clipboard.");
    later(2000, () => setCopied((c) => (c?.id === row.id ? null : c)));
  }

  // The menu stays open while the PDF builds, says when it's done, then
  // closes itself a beat later.
  function buildPdf(row: Estimate, close: () => void) {
    setPdf((p) => ({ ...p, [row.id]: "busy" }));
    later(1600, () => {
      setPdf((p) => ({ ...p, [row.id]: "done" }));
      setStatus(`Downloaded ${row.id.toLowerCase()}.pdf`);
      later(900, close);
      later(1300, () =>
        setPdf((p) => {
          const next = { ...p };
          delete next[row.id];
          return next;
        }),
      );
    });
  }

  // The deleted row's menu button is gone; focus the Undo button instead of <body>.
  useEffect(() => {
    if (undo) undoRef.current?.focus();
  }, [undo]);

  function update(id: string, patch: Partial<Estimate>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function duplicate(row: Estimate) {
    copies.current += 1;
    const copy: Estimate = { ...row, id: `EVT-04${13 + copies.current}`, address: `${row.address} (copy)`, status: "Draft", updated: "2026-10-23" };
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === row.id);
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
    setStatus(`Duplicated ${row.address}`);
  }

  function remove(row: Estimate) {
    const index = rows.findIndex((r) => r.id === row.id);
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    setUndo({ row, index });
    setStatus(`Deleted ${row.address}`);
  }

  function restore() {
    if (!undo) return;
    setRows((rs) => [...rs.slice(0, undo.index), undo.row, ...rs.slice(undo.index)]);
    setStatus(`Restored ${undo.row.address}`);
    setUndo(null);
  }

  const sorted = [...rows].sort(SORTS[sort].compare);

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={local.menuToolbar}>
          <h2 className={styles.heading}>Events</h2>
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="secondary">
                <span>Sort: {SORTS[sort].label}</span>
                <Icon className={local.menuChevron} name="chevron-down" />
              </Button>
            }
          >
            <MenuRadioGroup label="Sort by" value={sort} onValueChange={(v) => setSort(v as keyof typeof SORTS)}>
              <MenuRadioItem value="updated">Date updated</MenuRadioItem>
              <MenuRadioItem value="client">Host name</MenuRadioItem>
              <MenuRadioItem value="total">Total</MenuRadioItem>
              <MenuRadioItem value="expiry" disabled description="Set a date on each event first.">
                Event date
              </MenuRadioItem>
            </MenuRadioGroup>
          </DropdownMenu>
        </div>

        <ul className={local.menuList}>
          {sorted.length === 0 && <li className={local.menuEmpty}>No events left. Undo the delete to bring one back.</li>}
          {sorted.map((row) => (
            <li key={row.id} className={local.menuRow}>
              <div className={local.menuMain}>
                <span className={local.menuAddress}>{row.address}</span>
                <span className={local.menuMeta}>
                  {row.client} · {row.id} · {row.status}
                </span>
                {row.showCosts && (
                  <span className={local.menuCosts}>
                    Food {format(row.labor, row.currency)} · Venue {format(row.materials, row.currency)}
                  </span>
                )}
              </div>
              <span className={local.menuTotal}>{format(total(row), row.currency)}</span>
              <DropdownMenu
                align="end"
                trigger={
                  <Button variant="ghost" className={local.menuMore} aria-label={`Actions for ${row.address}`}>
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="3.5" cy="8" r="1.25" />
                      <circle cx="8" cy="8" r="1.25" />
                      <circle cx="12.5" cy="8" r="1.25" />
                    </svg>
                  </Button>
                }
              >
                <MenuItem icon={<Icon name="duplicate" />} onSelect={() => duplicate(row)}>
                  Duplicate
                </MenuItem>
                <MenuItem
                  icon={<Icon name={pdf[row.id] === "done" ? "check" : "download"} />}
                  shortcut="⌘D"
                  keyshortcuts="Meta+D"
                  closeOnSelect={false}
                  busy={pdf[row.id] === "busy"}
                  onSelect={({ close }) => buildPdf(row, close)}
                >
                  {pdf[row.id] === "done" ? "PDF downloaded" : "Download PDF"}
                </MenuItem>
                <MenuSub label="Share" icon={<PathIcon d={ICONS.share} />}>
                  <MenuItem
                    icon={<Icon name={copied?.id === row.id && copied.ok ? "check" : "link"} />}
                    closeOnSelect={false}
                    onSelect={() => copyLink(row)}
                  >
                    {copied?.id === row.id ? (copied.ok ? "Copied" : "Couldn’t copy") : "Copy link"}
                  </MenuItem>
                  <MenuItem icon={<PathIcon d={ICONS.mail} />} onSelect={() => setStatus(`Emailed ${row.client}`)}>
                    Email to host
                  </MenuItem>
                </MenuSub>
                <MenuItem
                  icon={<PathIcon d={ICONS.invoice} />}
                  disabled={row.status !== "Approved"}
                  description={row.status !== "Approved" ? "Needs the venue’s approval first." : undefined}
                  onSelect={() => setStatus(`Requested the deposit for ${row.address}`)}
                >
                  Request deposit
                </MenuItem>
                <MenuSeparator />
                <MenuCheckboxItem checked={row.showCosts} onCheckedChange={(showCosts) => update(row.id, { showCosts })}>
                  Show cost breakdown
                </MenuCheckboxItem>
                <MenuSeparator />
                <MenuRadioGroup label="Currency" value={row.currency} onValueChange={(currency) => update(row.id, { currency })}>
                  <MenuRadioItem value="USD">US dollar</MenuRadioItem>
                  <MenuRadioItem value="CAD">Canadian dollar</MenuRadioItem>
                  <MenuRadioItem value="EUR">Euro</MenuRadioItem>
                </MenuRadioGroup>
                <MenuSeparator />
                <MenuItem variant="danger" icon={<Icon name="trash" />} onSelect={() => remove(row)}>
                  Delete event
                </MenuItem>
              </DropdownMenu>
            </li>
          ))}
        </ul>

        <p className={local.menuStatus}>
          <span role="status">{status}</span>
          {undo && (
            <Button ref={undoRef} variant="ghost" onClick={restore}>
              Undo
            </Button>
          )}
        </p>
      </section>
    </div>
  );
}
