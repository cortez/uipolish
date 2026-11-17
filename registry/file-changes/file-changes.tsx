"use client";

import { useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { DiffStat, describeDiff, formatCount } from "../diff-stat/diff-stat";
import { Icon, type IconName } from "../icons/icons";
import { SkeletonGroup, SkeletonText } from "../skeleton/skeleton";
import styles from "./file-changes.module.css";

export type FileChangeKind = "added" | "modified" | "deleted" | "renamed";

export type FileChange = {
  /** Path from the repository root, with `/` between folders: "src/app/page.tsx". */
  path: string;
  /** Lines added and removed. Leave both out for a file that isn't changed (a plain file list). */
  added?: number;
  removed?: number;
  /** What happened to the file. Leave it out for an unchanged file. */
  kind?: FileChangeKind;
  /** The old path, for a rename. */
  from?: string;
};

const KIND_TEXT: Record<FileChangeKind, string> = {
  added: "Added",
  modified: "Modified",
  deleted: "Deleted",
  renamed: "Renamed",
};

const KIND_ICON: Record<FileChangeKind, IconName> = {
  added: "diff-added",
  modified: "diff-modified",
  deleted: "diff-removed",
  renamed: "diff-renamed",
};

/** "src/app/page.tsx" → ["src/app/", "page.tsx"]. */
export function splitPath(path: string): [dir: string, name: string] {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? ["", path] : [path.slice(0, cut + 1), path.slice(cut + 1)];
}

/** Files, lines added and lines removed across a list. */
export function totalChanges(files: FileChange[]) {
  return files.reduce(
    (t, f) => ({ files: t.files + 1, added: t.added + (f.added ?? 0), removed: t.removed + (f.removed ?? 0) }),
    { files: 0, added: 0, removed: 0 },
  );
}

/** "Modified, 12 lines added, 3 removed": a file's change in words. */
function describeFile(file: FileChange) {
  const parts: string[] = [];
  if (file.kind) parts.push(file.from ? `${KIND_TEXT[file.kind]} from ${file.from}` : KIND_TEXT[file.kind]);
  if (file.added !== undefined || file.removed !== undefined) parts.push(describeDiff(file.added ?? 0, file.removed ?? 0));
  return parts.join(", ");
}

/* ---------- One file ---------- */

/** What happened to a file, as the icon set's rounded square: a plus, a dot, a minus or an arrow; a plain file when nothing did. */
export function ChangeMark({ kind, className }: { kind?: FileChangeKind; className?: string }) {
  return (
    <Icon
      name={kind ? KIND_ICON[kind] : "file"}
      className={className ? `${styles.mark} ${className}` : styles.mark}
      data-kind={kind ?? "none"}
    />
  );
}

/** The folder in the muted color, cut from its start when there's no room; the name whole, in the text color. */
export function FilePath({ path, className }: { path: string; className?: string }) {
  const [dir, name] = splitPath(path);
  return (
    <span className={className ? `${styles.path} ${className}` : styles.path}>
      {dir && (
        // dir="rtl" puts the cut (and its fade) at the folder's start; the path itself still reads left to right.
        <span className={styles.dir} dir="rtl">
          <bdi dir="ltr">{dir}</bdi>
        </span>
      )}
      <bdi dir="ltr" className={styles.name}>
        {name}
      </bdi>
    </span>
  );
}

type FileChipProps = Omit<ComponentProps<"button">, "children"> & {
  /** The file's path. The chip shows its name; the whole path is its `title` and its accessible name. */
  path: string;
  added?: number;
  removed?: number;
  kind?: FileChangeKind;
  /** In a line of text: 20px, so it sits inside the line instead of touching the ones around it. */
  inline?: boolean;
};

/** A file named in a message, under a reply or in a summary. A button when it has `onClick`. */
export function FileChip({ path, added, removed, kind, inline = false, className, onClick, ...props }: FileChipProps) {
  const [, name] = splitPath(path);
  const hasStat = added !== undefined || removed !== undefined;
  const body = (
    <>
      <ChangeMark kind={kind} />
      <bdi dir="ltr" className={styles.chipName}>
        {name}
      </bdi>
      {hasStat && <DiffStat added={added ?? 0} removed={removed ?? 0} hideZero />}
    </>
  );
  const shared = {
    className: className ? `${styles.chip} ${className}` : styles.chip,
    title: path,
    "data-inline": inline || undefined,
  };
  return onClick ? (
    <button type="button" {...shared} onClick={onClick} {...props}>
      {body}
      <span className={styles.srOnly}>, {path}</span>
    </button>
  ) : (
    <span {...shared}>
      {body}
    </span>
  );
}

/* ---------- The list ---------- */

type FileChangesProps = {
  files: FileChange[];
  /** The selected file's path. */
  value?: string | null;
  /** Called with a path as the selection moves (arrow keys move it too). Without it the list is read-only. */
  onValueChange?: (path: string) => void;
  /** Names the list for screen readers. */
  label?: string;
  /** The "18 files  +1,204 −388" line above the list. */
  totals?: boolean;
  /** Holds the list's place with skeleton rows, after 300ms. */
  loading?: boolean;
  loadingLabel?: string;
  /** What shows with no files: a line or two, or an empty state. */
  empty?: ReactNode;
  /** Something at the end of the totals line: a filter, a "Collapse" button. */
  actions?: ReactNode;
  className?: string;
};

export function FileChanges({
  files,
  value,
  onValueChange,
  label = "Changed files",
  totals = true,
  loading = false,
  loadingLabel = "Loading files…",
  empty,
  actions,
  className,
}: FileChangesProps) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const sum = useMemo(() => totalChanges(files), [files]);
  const changed = files.some((f) => f.kind || f.added !== undefined || f.removed !== undefined);
  const selectable = Boolean(onValueChange);
  // The row that takes Tab: the selected one, else the one last focused, else the first.
  const [active, setActive] = useState<string | null>(null);
  const tabStop = files.some((f) => f.path === value) ? value : files.some((f) => f.path === active) ? active : files[0]?.path;

  function move(event: KeyboardEvent<HTMLElement>, index: number, path: string) {
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: files.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      const next = Math.max(0, Math.min(moves[event.key], files.length - 1));
      listRef.current?.querySelectorAll<HTMLElement>("[role='option']")[next]?.focus();
      // Selection follows focus, so the diff beside the list keeps up.
      onValueChange?.(files[next].path);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onValueChange?.(path);
    }
  }

  const header = totals && files.length > 0 && (
    <div className={styles.totals}>
      <span className={styles.count}>
        {formatCount(sum.files)} {sum.files === 1 ? "file" : "files"}
      </span>
      {changed && <DiffStat added={sum.added} removed={sum.removed} />}
      {actions && <span className={styles.actions}>{actions}</span>}
    </div>
  );

  const skeleton = (
    <div className={styles.skeleton}>
      {["62%", "48%", "74%", "40%", "56%", "68%"].map((width, i) => (
        <div key={i} className={styles.skeletonRow}>
          <SkeletonText size="sm" width={width} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <SkeletonGroup loading={loading} fallback={skeleton} label={loadingLabel}>
        {files.length === 0 ? (
          <div className={styles.empty}>{empty ?? <p className={styles.emptyText}>No files changed yet.</p>}</div>
        ) : (
          <>
            {header}
            <ul ref={listRef} id={id} className={styles.list} role={selectable ? "listbox" : undefined} aria-label={label}>
              {files.map((file, i) => {
                const selected = file.path === value;
                const words = describeFile(file);
                const body = (
                  <>
                    <ChangeMark kind={file.kind} />
                    <FilePath path={file.path} className={styles.rowPath} />
                    {(file.added !== undefined || file.removed !== undefined) && (
                      <DiffStat className={styles.rowStat} added={file.added ?? 0} removed={file.removed ?? 0} aria-hidden="true" />
                    )}
                    {words && <span className={styles.srOnly}>, {words}</span>}
                  </>
                );
                const title = file.from ? `${file.from} → ${file.path}` : file.path;
                return selectable ? (
                  <li
                    key={file.path}
                    role="option"
                    aria-selected={selected}
                    tabIndex={file.path === tabStop ? 0 : -1}
                    className={styles.row}
                    data-selected={selected || undefined}
                    title={title}
                    onClick={() => onValueChange?.(file.path)}
                    onFocus={() => setActive(file.path)}
                    onKeyDown={(e) => move(e, i, file.path)}
                  >
                    {body}
                  </li>
                ) : (
                  <li key={file.path} className={styles.row} title={title}>
                    {body}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SkeletonGroup>
    </div>
  );
}
