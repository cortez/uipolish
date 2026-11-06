"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { Icon } from "../icons/icons";
import { ScrollArea } from "../scroll-area/scroll-area";
import styles from "./file-upload.module.css";

export type UploadStatus = "uploading" | "done" | "failed" | "rejected";

export type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0 to 1 while uploading. */
  progress: number;
  /** Why it failed or was rejected, in plain words. */
  error?: string;
};

type Upload = (file: File, options: { signal: AbortSignal; onProgress: (fraction: number) => void }) => Promise<void>;

type FileUploadProps = {
  label: string;
  /** Sends one file; report progress, throw to fail it. */
  upload: Upload;
  /** As on a file input: ".pdf,image/*". */
  accept?: string;
  /** Plain words for `accept`, like "PDF, JPG or PNG". */
  acceptLabel?: string;
  /** Largest file, in bytes. */
  maxSize?: number;
  maxFiles?: number;
  onChange?: (items: UploadItem[]) => void;
  disabled?: boolean;
  className?: string;
};

function formatBytes(bytes: number) {
  const units = ["bytes", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${u === 0 ? n : n.toFixed(n < 10 ? 1 : 0)} ${units[u]}`;
}

function accepts(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .some((a) => (a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a));
}

/** "receipt.final.jpeg" → "JPEG"; no extension → "FILE". */
function extension(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  return (ext.length > 0 && ext.length <= 4 ? ext : "file").toUpperCase();
}

let counter = 0;

/** A drop zone with a list of uploads in a fixed-height panel. */
export function FileUpload({
  label,
  upload,
  accept,
  acceptLabel,
  maxSize,
  maxFiles,
  onChange,
  disabled = false,
  className,
}: FileUploadProps) {
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const controllers = useRef(new Map<string, AbortController>());
  const depth = useRef(0);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Report changes after they're committed, never while rendering.
  const reported = useRef(items);
  useEffect(() => {
    if (reported.current !== items) {
      reported.current = items;
      onChange?.(items);
    }
  }, [items, onChange]);

  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((c) => c.abort());
  }, []);

  const patch = (id: string, next: Partial<UploadItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...next } : item)));

  function start(id: string, file: File) {
    const controller = new AbortController();
    controllers.current.get(id)?.abort();
    controllers.current.set(id, controller);
    patch(id, { status: "uploading", progress: 0, error: undefined });
    upload(file, {
      signal: controller.signal,
      onProgress: (fraction) => {
        if (!controller.signal.aborted) patch(id, { progress: Math.min(Math.max(fraction, 0), 1) });
      },
    }).then(
      () => {
        if (controller.signal.aborted) return;
        controllers.current.delete(id);
        patch(id, { status: "done", progress: 1 });
        setAnnouncement(`${file.name} uploaded`);
      },
      (reason: unknown) => {
        if (controller.signal.aborted) return;
        controllers.current.delete(id);
        const message = reason instanceof Error && reason.message ? reason.message : "Upload failed. Try again.";
        patch(id, { status: "failed", error: message });
        setAnnouncement(`${file.name} didn’t upload: ${message}`);
      },
    );
  }

  function add(files: FileList | File[]) {
    if (disabled) return;
    const kept = items.filter((i) => i.status !== "rejected").length;
    const next: UploadItem[] = [];
    let room = maxFiles === undefined ? Infinity : maxFiles - kept;
    for (const file of files) {
      const id = `${baseId}-${++counter}`;
      let error: string | undefined;
      if (!accepts(file, accept)) error = acceptLabel ? `Not a ${acceptLabel} file` : "This kind of file can’t be added";
      else if (maxSize !== undefined && file.size > maxSize) error = `Too large: ${formatBytes(file.size)}. Up to ${formatBytes(maxSize)}.`;
      else if (room <= 0) error = `Only ${maxFiles} files can be added`;
      else room--;
      next.push({ id, file, status: error ? "rejected" : "uploading", progress: 0, error });
    }
    if (next.length === 0) return;
    refocus.current = document.activeElement === browseRef.current;
    setItems((list) => [...list, ...next]);
    const rejected = next.filter((n) => n.error);
    if (rejected.length) setAnnouncement(rejected.map((r) => `${r.file.name}: ${r.error}`).join(". "));
    for (const item of next) if (!item.error) start(item.id, item.file);
  }

  function remove(id: string) {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setItems((list) => list.filter((i) => i.id !== id));
    else setLeaving((s) => new Set(s).add(id));
  }

  function forget(id: string) {
    setItems((list) => list.filter((i) => i.id !== id));
    setLeaving((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  // Enter and leave fire on each child; count them so the highlight doesn't flicker.
  const onDragEnter = (event: DragEvent) => {
    if (disabled || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    depth.current++;
    setDragging(true);
  };
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files.length) add(event.dataTransfer.files);
  };

  const has = items.length > 0;
  // The prompt and the bar are different elements, so focus must follow the swap.
  useLayoutEffect(() => {
    if (refocus.current) browseRef.current?.focus();
    refocus.current = false;
  }, [has]);

  const constraints = [acceptLabel, maxSize !== undefined && `up to ${formatBytes(maxSize)}`].filter(Boolean).join(", ");

  const browseButton = (
    <button
      key={has ? "bar" : "empty"}
      ref={browseRef}
      type="button"
      className={styles.browse}
      disabled={disabled}
      aria-describedby={`${baseId}-constraints`}
      aria-labelledby={`${baseId}-label ${baseId}-action`}
      onClick={() => inputRef.current?.click()}
    >
      <span className={styles.mark}>
        <Icon name={has ? "plus" : "upload"} />
      </span>
      <span className={styles.prompt}>
        <span id={`${baseId}-action`} className={styles.action}>
          {dragging ? "Drop to add" : has ? "Add more files" : "Drop files here or browse"}
        </span>
        <span id={`${baseId}-constraints`} className={styles.constraints}>
          {constraints}
        </span>
      </span>
    </button>
  );

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <span id={`${baseId}-label`} className={styles.label}>
        {label}
      </span>
      <div
        className={styles.zone}
        data-dragging={dragging || undefined}
        data-has={has || undefined}
        data-disabled={disabled || undefined}
        onDragEnter={onDragEnter}
        onDragOver={(e) => {
          if (!disabled && e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className={styles.input}
          accept={accept}
          multiple={maxFiles !== 1}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.currentTarget.files) add(e.currentTarget.files);
            // The same file can be picked again after it's removed.
            e.currentTarget.value = "";
          }}
        />
        {!has && browseButton}
        {has && (
          <ScrollArea className={styles.scroll}>
            <ul className={styles.list} aria-labelledby={`${baseId}-label`}>
              {items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  leaving={leaving.has(item.id)}
                  onRetry={() => start(item.id, item.file)}
                  onRemove={() => remove(item.id)}
                  onGone={() => forget(item.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
        {has && browseButton}
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}

function Row({
  item,
  leaving,
  onRetry,
  onRemove,
  onGone,
}: {
  item: UploadItem;
  leaving: boolean;
  onRetry: () => void;
  onRemove: () => void;
  onGone: () => void;
}) {
  const { file, status, progress, error } = item;
  const meta =
    status === "uploading"
      ? `${Math.round(progress * 100)}% of ${formatBytes(file.size)}`
      : status === "done"
        ? `Uploaded, ${formatBytes(file.size)}`
        : error;

  return (
    <li
      className={styles.row}
      data-status={status}
      data-leaving={leaving || undefined}
      inert={leaving || undefined}
      onAnimationEnd={(e) => {
        // The fade ends first; the row goes once its space has closed.
        if (leaving && e.target === e.currentTarget && e.animationName.includes("close")) onGone();
      }}
    >
      <span className={styles.wash} aria-hidden="true" style={{ "--progress": progress } as CSSProperties} />
      <span className={styles.badge} aria-hidden="true">
        {status === "done" ? <Icon name="check" /> : extension(file.name)}
      </span>
      <span className={styles.text}>
        <span className={styles.name} title={file.name}>
          {file.name}
        </span>
        <span className={styles.meta}>{meta}</span>
      </span>
      <span className={styles.actions}>
        {status === "failed" && (
          <button type="button" className={styles.icon} aria-label={`Retry ${file.name}`} onClick={onRetry}>
            <Icon name="retry" />
          </button>
        )}
        <button
          type="button"
          className={styles.icon}
          aria-label={status === "uploading" ? `Cancel ${file.name}` : `Remove ${file.name}`}
          onClick={onRemove}
        >
          <Icon name="close" />
        </button>
      </span>
    </li>
  );
}
