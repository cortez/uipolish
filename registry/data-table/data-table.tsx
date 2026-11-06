"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Checkbox } from "../checkbox/checkbox";
import { Icon } from "../icons/icons";
import styles from "./data-table.module.css";

export type SortDirection = "ascending" | "descending";
export type SortState = { key: string; direction: SortDirection } | null;
type CellValue = string | number | Date | null | undefined;

export type DataTableColumn<Row> = {
  /** Unique per table; also the default row field. */
  key: string;
  header: string;
  /** Defaults to the value as text. */
  cell?: (row: Row) => ReactNode;
  /** The value sorted on. Defaults to `row[key]`; text sorts naturally. */
  value?: (row: Row) => CellValue;
  /** Px. Defaults to 160. */
  width?: number;
  /** Defaults to 72. */
  minWidth?: number;
  /** Defaults to 640. */
  maxWidth?: number;
  /** `end` for numbers (tabular figures). */
  align?: "start" | "end";
  sortable?: boolean;
  /** Custom ascending comparator. */
  compare?: (a: Row, b: Row) => number;
  /** Returns a message when the cell is invalid. */
  validate?: (row: Row) => string | null | undefined;
  /** Defaults to true. */
  resizable?: boolean;
};

type DataTableProps<Row> = Omit<ComponentProps<"div">, "children" | "onChange" | "role"> & {
  columns: DataTableColumn<Row>[];
  rows: readonly Row[];
  /** A stable id per row; selection follows it. */
  getRowId: (row: Row) => string;
  /** Names a row in its checkbox label and messages. */
  getRowLabel?: (row: Row) => string;
  /** Names the grid; prefer `aria-labelledby` with a visible heading. */
  "aria-label"?: string;
  "aria-labelledby"?: string;

  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;

  columnWidths?: Record<string, number>;
  defaultColumnWidths?: Record<string, number>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;

  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  defaultSelectedIds?: Iterable<string>;
  onSelectedIdsChange?: (ids: Set<string>) => void;

  /** Pins the first column (and checkboxes). */
  stickyFirstColumn?: boolean;
  /** Fixed row height in px, used for virtualization. Defaults to 44. */
  rowHeight?: number;
  /** Rows rendered past each edge of the visible window. Defaults to 6. */
  overscan?: number;
  loading?: boolean;
  loadingLabel?: string;
  /** Usually an EmptyState. */
  empty?: ReactNode;
  /** Locale for text sorting; fixed so server and browser sort alike. */
  locale?: string;
};

type Cell = { row: number; col: number };

const SELECT_WIDTH = 40;
const DEFAULT_WIDTH = 160;
const DEFAULT_MIN = 72;
const DEFAULT_MAX = 640;
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;
const INITIAL_ROWS = 24;

const INTERACTIVE =
  'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [tabindex]:not([data-cell])';

const issueKey = (rowId: string, columnKey: string) => `${rowId}\u0000${columnKey}`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isEmpty = (v: CellValue) =>
  v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v)) || (v instanceof Date && Number.isNaN(v.getTime()));

function defaultValue<Row>(column: DataTableColumn<Row>): (row: Row) => CellValue {
  return column.value ?? ((row) => (row as Record<string, CellValue>)[column.key]);
}

function minOf<Row>(column: DataTableColumn<Row>) {
  return column.minWidth ?? DEFAULT_MIN;
}

function maxOf<Row>(column: DataTableColumn<Row>) {
  return Math.max(column.maxWidth ?? DEFAULT_MAX, minOf(column));
}

/** A keyboard-first, virtualized data grid. */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  getRowLabel,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  sort: controlledSort,
  defaultSort = null,
  onSortChange,
  columnWidths: controlledWidths,
  defaultColumnWidths,
  onColumnWidthsChange,
  selectable = false,
  selectedIds: controlledSelected,
  defaultSelectedIds,
  onSelectedIdsChange,
  stickyFirstColumn = false,
  rowHeight = 44,
  overscan = 6,
  loading = false,
  loadingLabel = "Loading rows…",
  empty,
  locale = "en-US",
  className,
  style,
  ...props
}: DataTableProps<Row>) {
  const baseId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  /* ---------- Sorting ---------- */

  const [uncontrolledSort, setUncontrolledSort] = useState<SortState>(defaultSort);
  const sort = controlledSort === undefined ? uncontrolledSort : controlledSort;
  const sortColumn = sort ? columns.find((c) => c.key === sort.key && c.sortable) : undefined;
  const [announcement, setAnnouncement] = useState("");

  const collator = useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: "base" }), [locale]);

  // Stable (index breaks ties); empty values go last in either direction.
  const sortedRows = useMemo(() => {
    if (!sort || !sortColumn) return rows;
    const sign = sort.direction === "ascending" ? 1 : -1;
    const compare = sortColumn.compare;
    if (compare) {
      return rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => sign * compare(a.row, b.row) || a.index - b.index)
        .map((x) => x.row);
    }
    const read = defaultValue(sortColumn);
    return rows
      .map((row, index) => {
        const raw = read(row);
        const value = raw instanceof Date ? raw.getTime() : raw;
        return { row, index, value, blank: isEmpty(raw) };
      })
      .sort((a, b) => {
        if (a.blank || b.blank) return Number(a.blank) - Number(b.blank) || a.index - b.index;
        const order =
          typeof a.value === "number" && typeof b.value === "number"
            ? a.value - b.value
            : collator.compare(String(a.value), String(b.value));
        return sign * order || a.index - b.index;
      })
      .map((x) => x.row);
  }, [rows, sort, sortColumn, collator]);

  function cycleSort(column: DataTableColumn<Row>) {
    const next: SortState =
      sort?.key !== column.key
        ? { key: column.key, direction: "ascending" }
        : sort.direction === "ascending"
          ? { key: column.key, direction: "descending" }
          : null;
    if (controlledSort === undefined) setUncontrolledSort(next);
    onSortChange?.(next);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    setAnnouncement(next ? `Sorted by ${column.header}, ${next.direction}` : "Sort cleared");
  }

  /* ---------- Column widths ---------- */

  const [uncontrolledWidths, setUncontrolledWidths] = useState<Record<string, number>>(defaultColumnWidths ?? {});
  const widths = controlledWidths ?? uncontrolledWidths;
  const widthsRef = useRef(widths);
  useLayoutEffect(() => {
    widthsRef.current = widths;
  });

  const widthOf = (column: DataTableColumn<Row>) =>
    clamp(Math.round(widths[column.key] ?? column.width ?? DEFAULT_WIDTH), minOf(column), maxOf(column));

  const setWidth = useCallback(
    (key: string, width: number | undefined) => {
      const next = { ...widthsRef.current };
      if (width === undefined) delete next[key];
      else next[key] = width;
      widthsRef.current = next;
      if (controlledWidths === undefined) setUncontrolledWidths(next);
      onColumnWidthsChange?.(next);
    },
    [controlledWidths, onColumnWidthsChange],
  );

  /* ---------- Selection ---------- */

  const [uncontrolledSelected, setUncontrolledSelected] = useState<ReadonlySet<string>>(
    () => new Set(defaultSelectedIds ?? []),
  );
  const selected = controlledSelected ?? uncontrolledSelected;
  const anchorRef = useRef<string | null>(null);
  const shiftRef = useRef(false);

  const rowIds = useMemo(() => sortedRows.map(getRowId), [sortedRows, getRowId]);
  const selectedCount = useMemo(() => rowIds.reduce((n, id) => n + (selected.has(id) ? 1 : 0), 0), [rowIds, selected]);
  const allSelected = rowIds.length > 0 && selectedCount === rowIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  function commitSelection(next: Set<string>) {
    if (controlledSelected === undefined) setUncontrolledSelected(next);
    onSelectedIdsChange?.(next);
  }

  function toggleAll() {
    const next = new Set(selected);
    for (const id of rowIds) {
      if (allSelected) next.delete(id);
      else next.add(id);
    }
    commitSelection(next);
  }

  function toggleRow(index: number, range: boolean) {
    const id = rowIds[index];
    const on = !selected.has(id);
    const next = new Set(selected);
    const anchor = anchorRef.current === null ? -1 : rowIds.indexOf(anchorRef.current);
    if (range && anchor !== -1) {
      const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
      for (let i = from; i <= to; i++) {
        if (on) next.add(rowIds[i]);
        else next.delete(rowIds[i]);
      }
    } else if (on) next.add(id);
    else next.delete(id);
    anchorRef.current = id;
    commitSelection(next);
  }

  /* ---------- Validation ---------- */

  const issues = useMemo(() => {
    const map = new Map<string, string>();
    for (const column of columns) {
      if (!column.validate) continue;
      for (const row of rows) {
        const message = column.validate(row);
        if (message) map.set(issueKey(getRowId(row), column.key), message);
      }
    }
    return map;
  }, [rows, columns, getRowId]);

  /* ---------- Layout ---------- */

  const offset = selectable ? 1 : 0;
  const colCount = columns.length + offset;
  // Only pin while the pinned part takes at most 60% of the box.
  const [viewWidth, setViewWidth] = useState(Infinity);
  const columnWidths = columns.map(widthOf);
  // In a narrow box (a phone), a pinned first column gives up width, down to
  // its minimum, so it can stay pinned: the names stay in view while the
  // other columns scroll under them. A width someone dragged is kept.
  if (stickyFirstColumn && columns.length > 0 && widths[columns[0].key] === undefined) {
    const room = Math.floor(viewWidth * 0.6) - (selectable ? SELECT_WIDTH : 0);
    if (room < columnWidths[0]) columnWidths[0] = Math.max(minOf(columns[0]), room);
  }
  const template = [...(selectable ? [`${SELECT_WIDTH}px`] : []), ...columnWidths.map((w) => `${w}px`), "minmax(0, 1fr)"].join(" ");
  const total = (selectable ? SELECT_WIDTH : 0) + columnWidths.reduce((a, b) => a + b, 0);
  const pinnedWidth = columns.length > 0 ? (selectable ? SELECT_WIDTH : 0) + columnWidths[0] : 0;
  const stickyCount = stickyFirstColumn && columns.length > 0 && pinnedWidth <= viewWidth * 0.6 ? offset + 1 : 0;
  const stickyWidth = stickyCount === 0 ? 0 : pinnedWidth;

  /* ---------- Virtual window ---------- */

  const [range, setRange] = useState({ start: 0, end: INITIAL_ROWS });
  const [bodyHeight, setBodyHeight] = useState(INITIAL_ROWS * rowHeight);
  const rowCount = sortedRows.length;
  const showRows = rowCount > 0;
  const showLoading = loading && !showRows;
  const showEmpty = !loading && !showRows;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const head = headRef.current;
    if (!viewport || !head) return;
    const visible = Math.max(0, viewport.clientHeight - head.offsetHeight);
    const top = viewport.scrollTop;
    const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
    const end = Math.ceil((top + visible) / rowHeight) + overscan;
    setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
    setBodyHeight(visible);

    // scrollLeft is negative in RTL, so use its magnitude.
    const max = viewport.scrollWidth - viewport.clientWidth;
    const inline = Math.abs(viewport.scrollLeft);
    viewport.toggleAttribute("data-more-start", inline > 1);
    viewport.toggleAttribute("data-more-end", max - inline > 1);
    viewport.style.setProperty("--data-table-bar-block", `${Math.max(0, viewport.offsetWidth - viewport.clientWidth)}px`);
    viewport.style.setProperty("--data-table-bar-inline", `${Math.max(0, viewport.offsetHeight - viewport.clientHeight)}px`);
    viewport.style.setProperty("--data-table-viewport-width", `${viewport.clientWidth}px`);
    setViewWidth(viewport.clientWidth);
  }, [rowHeight, overscan]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    measure();
      const frame = requestAnimationFrame(() => viewport.setAttribute("data-ready", ""));
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    viewport.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // Widths and row count change the scroll range without a resize.
  useLayoutEffect(() => measure(), [measure, total, rowCount]);

  /* ---------- Active cell and focus ---------- */

  const [active, setActive] = useState<Cell>({ row: 0, col: 0 });
  const [focused, setFocused] = useState(false);
  const focusPending = useRef(false);
  const lastRow = showRows ? rowCount : 0;
  const current: Cell = { row: clamp(active.row, 0, lastRow), col: clamp(active.col, 0, colCount - 1) };

  const cellId = (cell: Cell) => `${baseId}-${cell.row}-${cell.col}`;

  function moveTo(cell: Cell) {
    focusPending.current = true;
    setActive({ row: clamp(cell.row, 0, lastRow), col: clamp(cell.col, 0, colCount - 1) });
  }

  useLayoutEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const el = document.getElementById(cellId(current));
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  // The grid is one tab stop. Runs every render: cell content can change.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    for (const el of viewport.querySelectorAll<HTMLElement>(`[data-cell] :is(${INTERACTIVE})`)) {
      if (el.dataset.resize === undefined && el.tabIndex !== -1) el.tabIndex = -1;
    }
  });

  function cellFrom(target: EventTarget | null) {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-cell]");
    if (!el || !viewportRef.current?.contains(el)) return null;
    return { el, cell: { row: Number(el.dataset.row), col: Number(el.dataset.col) } };
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    setFocused(true);
    const hit = cellFrom(event.target);
    if (hit && (hit.cell.row !== current.row || hit.cell.col !== current.col)) setActive(hit.cell);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }

  function activate(el: HTMLElement) {
    shiftRef.current = false;
    const target = el.querySelector<HTMLElement>(INTERACTIVE);
    target?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const hit = cellFrom(event.target);
    if (!hit || event.altKey) return;
    const { el, cell } = hit;
    const inside = event.target !== el;
    const mod = event.ctrlKey || event.metaKey;

    if (inside) {
      // Focus is inside the cell: Space and Enter belong to the control.
      if (event.key === "Escape") {
        event.preventDefault();
        el.focus();
        return;
      }
      if (event.key === " " || event.key === "Enter") return;
    }

    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const page = Math.max(1, Math.floor(bodyHeight / rowHeight) - 1);
    let next: Cell | null = null;

    switch (event.key) {
      case "ArrowDown":
        next = { row: cell.row + 1, col: cell.col };
        break;
      case "ArrowUp":
        next = { row: cell.row - 1, col: cell.col };
        break;
      case "ArrowRight":
        next = { row: cell.row, col: cell.col + (rtl ? -1 : 1) };
        break;
      case "ArrowLeft":
        next = { row: cell.row, col: cell.col + (rtl ? 1 : -1) };
        break;
      case "Home":
        next = mod ? { row: 0, col: 0 } : { row: cell.row, col: 0 };
        break;
      case "End":
        next = mod ? { row: lastRow, col: colCount - 1 } : { row: cell.row, col: colCount - 1 };
        break;
      case "PageDown":
        next = { row: cell.row === 0 ? Math.min(page, lastRow) : cell.row + page, col: cell.col };
        break;
      case "PageUp":
        next = { row: cell.row <= 1 ? 0 : Math.max(1, cell.row - page), col: cell.col };
        break;
      case "Enter":
        event.preventDefault();
        activate(el);
        return;
      case " ":
        event.preventDefault();
        if (selectable && cell.row > 0 && (cell.col === 0 || event.shiftKey)) toggleRow(cell.row - 1, false);
        else if (selectable && cell.row === 0 && cell.col === 0) toggleAll();
        else if (cell.row === 0) activate(el);
        return;
      case "a":
      case "A":
        if (mod && selectable && showRows) {
          event.preventDefault();
          if (!allSelected) toggleAll();
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next.row === 0 && cell.row !== 0 && event.key !== "ArrowUp" && viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
    moveTo(next);
  }

  /* ---------- Rows to render ---------- */

  const first = Math.min(range.start, rowCount);
  const last = Math.min(range.end, rowCount);
  const indices: number[] = [];
  // Keep the active row rendered when scrolled away so focus is never unmounted.
  if (showRows && current.row > 0 && current.row - 1 < first) indices.push(current.row - 1);
  for (let i = first; i < last; i++) indices.push(i);
  if (showRows && current.row > 0 && current.row - 1 >= last) indices.push(current.row - 1);

  const activeId = showRows && current.row > 0 ? rowIds[current.row - 1] : null;
  const activeColumn = current.col >= offset ? columns[current.col - offset] : undefined;
  const activeIssue = activeId && activeColumn ? issues.get(issueKey(activeId, activeColumn.key)) : undefined;
  const activeRowLabel =
    activeIssue && getRowLabel ? getRowLabel(sortedRows[current.row - 1]) : `Row ${current.row}`;

  const placeholderRows = Math.max(1, Math.ceil(bodyHeight / rowHeight));

  const vars = {
    "--data-table-template": template,
    "--data-table-total": `${total}px`,
    "--data-table-row": `${rowHeight}px`,
    "--data-table-sticky": `${stickyWidth}px`,
    "--data-table-sticky-second": `${selectable ? SELECT_WIDTH : 0}px`,
  } as CSSProperties;

  const stickyAttrs = (col: number) =>
    col < stickyCount ? { "data-sticky": "", "data-sticky-last": col === stickyCount - 1 ? "" : undefined } : {};

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      style={{ ...vars, ...style }}
      data-focused={focused || undefined}
      {...props}
    >
      <div
        ref={viewportRef}
        role="grid"
        className={styles.viewport}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-rowcount={showRows ? rowCount + 1 : showLoading || showEmpty ? 2 : 1}
        aria-colcount={colCount}
        aria-multiselectable={selectable || undefined}
        aria-busy={loading || undefined}
        data-sticky-columns={stickyCount > 0 || undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.content} role="presentation">
          <div ref={headRef} role="rowgroup" className={styles.head}>
            <div role="row" aria-rowindex={1} className={styles.headRow}>
              {selectable && (
                <div
                  id={cellId({ row: 0, col: 0 })}
                  role="columnheader"
                  className={`${styles.headCell} ${styles.selectCell}`}
                  tabIndex={current.row === 0 && current.col === 0 ? 0 : -1}
                  data-cell=""
                  data-row={0}
                  data-col={0}
                  {...stickyAttrs(0)}
                >
                  <Checkbox
                    className={styles.check}
                    aria-label="Select all rows"
                    tabIndex={-1}
                    checked={allSelected}
                    indeterminate={someSelected}
                    disabled={!showRows}
                    onCheckedChange={toggleAll}
                  />
                </div>
              )}
              {columns.map((column, i) => {
                const col = i + offset;
                return (
                  <HeaderCell
                    key={column.key}
                    id={cellId({ row: 0, col })}
                    column={column}
                    col={col}
                    width={columnWidths[i]}
                    sort={sort?.key === column.key && sortColumn ? sort.direction : null}
                    isActive={current.row === 0 && current.col === col}
                    onSort={() => cycleSort(column)}
                    onResize={(w) => setWidth(column.key, w)}
                    sticky={stickyAttrs(col)}
                  />
                );
              })}
            </div>
          </div>

          <div
            role="rowgroup"
            className={styles.body}
            style={showRows ? { height: rowCount * rowHeight } : undefined}
          >
            {indices.map((index) => {
              const row = sortedRows[index];
              const id = rowIds[index];
              const isSelected = selected.has(id);
              const rowLabel = getRowLabel?.(row) ?? `row ${index + 1}`;
              return (
                <div
                  key={id}
                  role="row"
                  aria-rowindex={index + 2}
                  aria-selected={selectable ? isSelected : undefined}
                  className={styles.row}
                  style={{ top: index * rowHeight }}
                  data-active={current.row === index + 1 || undefined}
                >
                  {selectable && (
                    <div
                      id={cellId({ row: index + 1, col: 0 })}
                      role="gridcell"
                      className={`${styles.cell} ${styles.selectCell}`}
                      tabIndex={current.row === index + 1 && current.col === 0 ? 0 : -1}
                      data-cell=""
                      data-row={index + 1}
                      data-col={0}
                      {...stickyAttrs(0)}
                      onPointerDown={(e) => {
                        shiftRef.current = e.shiftKey;
                        // Prevents text selection on shift-click.
                        if (e.shiftKey) e.preventDefault();
                      }}
                    >
                      <Checkbox
                        className={styles.check}
                        aria-label={`Select ${rowLabel}`}
                        tabIndex={-1}
                        checked={isSelected}
                        onCheckedChange={() => {
                          toggleRow(index, shiftRef.current);
                          shiftRef.current = false;
                        }}
                      />
                    </div>
                  )}
                  {columns.map((column, i) => {
                    const col = i + offset;
                    const issue = column.validate ? issues.get(issueKey(id, column.key)) : undefined;
                    const messageId = issue ? `${cellId({ row: index + 1, col })}-issue` : undefined;
                    return (
                      <div
                        key={column.key}
                        id={cellId({ row: index + 1, col })}
                        role="gridcell"
                        className={styles.cell}
                        tabIndex={current.row === index + 1 && current.col === col ? 0 : -1}
                        data-cell=""
                        data-row={index + 1}
                        data-col={col}
                        data-align={column.align ?? "start"}
                        data-invalid={issue ? "" : undefined}
                        aria-invalid={issue ? true : undefined}
                        aria-describedby={messageId}
                        {...stickyAttrs(col)}
                      >
                        <CellValue column={column} row={row} />
                        {issue && (
                          <>
                            <Icon name="alert" className={styles.issueIcon} />
                            <span id={messageId} className={styles.srOnly}>
                              {issue}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {showLoading && (
              <div role="row" aria-rowindex={2} className={styles.placeholder}>
                <div role="gridcell" aria-colspan={colCount} className={styles.placeholderCell}>
                  <div className={styles.placeholderRows} aria-hidden="true">
                    {Array.from({ length: placeholderRows }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                  <div className={styles.loadingLine}>
                    <span className={styles.loadingLabel}>{loadingLabel}</span>
                  </div>
                </div>
              </div>
            )}

            {showEmpty && (
              <div role="row" aria-rowindex={2} className={styles.placeholder}>
                <div role="gridcell" aria-colspan={colCount} className={styles.emptyCell}>
                  {empty ?? <p className={styles.emptyText}>Nothing here yet.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {issues.size > 0 && showRows && (
        <p className={styles.footer} data-issue={activeIssue && focused ? "" : undefined}>
          <Icon name="alert" className={styles.footerIcon} />
          {activeIssue && focused ? (
            <span key={`${activeId}-${activeColumn?.key}`} className={styles.footerText}>
              <span className={styles.footerWhere}>
                {activeRowLabel}, {activeColumn?.header}
              </span>{" "}
              {activeIssue}
            </span>
          ) : (
            <span key="summary" className={styles.footerText}>
              {issues.size === 1 ? "1 cell needs a look" : `${issues.size} cells need a look`}
            </span>
          )}
        </p>
      )}

      <span className={styles.srOnly} role="status">
        {announcement}
      </span>
    </div>
  );
}

/** A cell stays one line, because rows are a fixed height for virtualizing.
 *  When its text is cut, the full value is its title, so it's never lost. */
function CellValue<Row>({ column, row }: { column: DataTableColumn<Row>; row: Row }) {
  const content = renderCell(column, row);
  return (
    <span
      className={styles.value}
      title={typeof content === "string" ? content : undefined}
    >
      {content}
    </span>
  );
}

function renderCell<Row>(column: DataTableColumn<Row>, row: Row): ReactNode {
  if (column.cell) return column.cell(row);
  const value = defaultValue(column)(row);
  if (isEmpty(value)) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

/* ---------- Header cell: sort button and resize handle ---------- */

type HeaderCellProps<Row> = {
  id: string;
  column: DataTableColumn<Row>;
  col: number;
  width: number;
  sort: SortDirection | null;
  isActive: boolean;
  onSort: () => void;
  onResize: (width: number | undefined) => void;
  sticky: Record<string, string | undefined>;
};

function HeaderCell<Row>({ id, column, col, width, sort, isActive, onSort, onResize, sticky }: HeaderCellProps<Row>) {
  const resizable = column.resizable ?? true;
  const min = minOf(column);
  const max = maxOf(column);
  const drag = useRef<{ x: number; width: number; pointer: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  // Keep the direction while the arrow fades out.
  const [arrow, setArrow] = useState<"arrow-up" | "arrow-down">(sort === "descending" ? "arrow-down" : "arrow-up");
  const wanted = sort === "descending" ? "arrow-down" : sort === "ascending" ? "arrow-up" : null;
  if (wanted && wanted !== arrow) setArrow(wanted);
  useEffect(() => {
    if (sort || arrow === "arrow-up") return;
    const timer = window.setTimeout(() => setArrow("arrow-up"), 240);
    return () => window.clearTimeout(timer);
  }, [sort, arrow]);

  const rtl = (el: Element) => getComputedStyle(el).direction === "rtl";

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width, pointer: event.pointerId };
    setResizing(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLSpanElement>) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    const delta = (event.clientX - d.x) * (rtl(event.currentTarget) ? -1 : 1);
    onResize(clamp(Math.round(d.width + delta), min, max));
  }

  function endDrag(event: PointerEvent<HTMLSpanElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setResizing(false);
  }

  useEffect(() => {
    if (!resizing) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !drag.current) return;
      onResize(drag.current.width);
      drag.current = null;
      setResizing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resizing, onResize]);

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const cell = event.currentTarget.closest<HTMLElement>("[data-cell]");
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const grow = rtl(event.currentTarget) ? "ArrowLeft" : "ArrowRight";
    const shrink = rtl(event.currentTarget) ? "ArrowRight" : "ArrowLeft";
    let next: number | null = null;
    if (event.key === grow) next = width + step;
    else if (event.key === shrink) next = width - step;
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      cell?.focus();
      return;
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Keep the grid from moving focus away mid-adjustment.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onResize(clamp(next, min, max));
  }

  const label = (
    <>
      <span className={styles.headLabel} title={typeof column.header === "string" ? column.header : undefined}>
        {column.header}
      </span>
      {column.sortable && <Icon name={arrow} className={styles.sortIcon} />}
    </>
  );

  return (
    <div
      id={id}
      role="columnheader"
      className={styles.headCell}
      tabIndex={isActive ? 0 : -1}
      aria-sort={sort ?? undefined}
      data-cell=""
      data-row={0}
      data-col={col}
      data-align={column.align ?? "start"}
      data-sorted={sort ? "" : undefined}
      data-resizing={resizing || undefined}
      {...sticky}
    >
      {column.sortable ? (
        <button type="button" tabIndex={-1} className={styles.sortButton} onClick={onSort}>
          {label}
        </button>
      ) : (
        <span className={styles.headStatic}>{label}</span>
      )}
      {resizable && (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${column.header} column`}
          aria-valuenow={width}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`${width} pixels`}
          // Tabbable only from its own active header cell; the grid stays one stop.
          tabIndex={isActive ? 0 : -1}
          data-resize=""
          className={styles.resize}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onDoubleClick={() => onResize(undefined)}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}
