"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./prompt-input.module.css";

export type PromptMessage = { text: string; files: File[] };

export type PromptInputHandle = {
  /** Focus the textarea with the caret at the end. */
  focus: () => void;
  /** Replace the draft (for "edit last message") and focus it. */
  setText: (text: string) => void;
};

type Attachment = { id: string; file: File };

type PromptInputProps = {
  /** Called with the trimmed text and the attached files. Return `false` to keep the draft. */
  onSubmit: (message: PromptMessage) => void | false;
  /** A reply is streaming: Send becomes Stop, and Escape stops. */
  streaming?: boolean;
  onStop?: () => void;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Prompt chips above the composer, for an empty thread. */
  suggestions?: string[];
  /** Toolbar content after the attach button. */
  footer?: ReactNode;
  placeholder?: string;
  /** Accessible name of the textarea. */
  label?: string;
  /** A line under the composer. `false` removes it, notices included. */
  hint?: ReactNode | false;
  /** Allow attaching files: a button, paste and drop. */
  attachments?: boolean;
  /** Same syntax as the `accept` attribute. */
  accept?: string;
  maxFiles?: number;
  defaultFiles?: File[];
  /** Rows the textarea grows to before it scrolls. */
  maxRows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  ref?: Ref<PromptInputHandle>;
};


let nextId = 0;

function token(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function ms(value: string) {
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function accepts(file: File, accept?: string) {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(",").some((raw) => {
    const rule = raw.trim().toLowerCase();
    if (!rule) return false;
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : "File";
}

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function PromptInput({
  onSubmit,
  streaming = false,
  onStop,
  value,
  defaultValue = "",
  onValueChange,
  suggestions,
  footer,
  placeholder = "Send a message",
  label = "Message",
  hint,
  attachments: allowFiles = true,
  accept,
  maxFiles = 10,
  defaultFiles,
  maxRows = 8,
  disabled = false,
  autoFocus,
  className,
  ref,
}: PromptInputProps) {
  const [innerText, setInnerText] = useState(defaultValue);
  const text = value ?? innerText;
  const [files, setFiles] = useState<Attachment[]>(() =>
    (defaultFiles ?? []).map((file, i) => ({ id: `default-${i}`, file })),
  );
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Set by the first notice, so the hint on first paint doesn't fade in.
  const [noticed, setNoticed] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const composing = useRef(false);
  const dragDepth = useRef(0);
  const caretToEnd = useRef(false);
  const flip = useRef<Map<string, [number, number]> | null>(null);
  const focusAfterRemove = useRef<string | null>(null);
  const noticeTimer = useRef(0);

  const hintId = useId();
  const canSend = !disabled && !streaming && (text.trim() !== "" || files.length > 0);

  function setText(next: string) {
    if (value === undefined) setInnerText(next);
    onValueChange?.(next);
  }

  function focusAtEnd() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollTop = el.scrollHeight;
  }

  useImperativeHandle(ref, () => ({
    focus: focusAtEnd,
    setText(next: string) {
      caretToEnd.current = true;
      if (value === undefined) setInnerText(next);
      onValueChange?.(next);
    },
  }));

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Fallback for no `field-sizing: content`. Both start at rows={1}, so the first keystroke can't jump.
    if (!CSS.supports("field-sizing", "content")) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    if (caretToEnd.current) {
      caretToEnd.current = false;
      focusAtEnd();
    }
  }, [text]);

  // After a removal, slide chips into place and focus a neighbor, not <body>.
  useLayoutEffect(() => {
    const before = flip.current;
    const list = listRef.current;
    flip.current = null;
    if (before && list && !reducedMotion()) {
      const spring = token(list, "--ui-ease-move", "ease-out");
      const duration = ms(token(list, "--ui-dur-move", "400ms"));
      for (const el of list.querySelectorAll<HTMLElement>("[data-id]")) {
        const from = before.get(el.dataset.id!);
        if (from === undefined) continue;
        const dx = from[0] - el.offsetLeft;
        const dy = from[1] - el.offsetTop;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate({ transform: [`translate(${dx}px, ${dy}px)`, "none"] }, { duration, easing: spring });
        }
      }
    }
    const target = focusAfterRemove.current;
    focusAfterRemove.current = null;
    if (target === "textarea") textareaRef.current?.focus();
    else if (target) list?.querySelector<HTMLElement>(`[data-remove="${target}"]`)?.focus();
  }, [files]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  function showNotice(message: string) {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    setNoticed(true);
    setAnnouncement(message);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  }

  function addFiles(incoming: File[]) {
    if (!allowFiles || disabled || incoming.length === 0) return;
    const accepted: File[] = [];
    let rejected: File | null = null;
    let overflow = 0;
    for (const file of incoming) {
      if (!accepts(file, accept)) rejected = file;
      else if (files.length + accepted.length >= maxFiles) overflow++;
      else accepted.push(file);
    }
    if (accepted.length) {
      setFiles((prev) => [...prev, ...accepted.map((file) => ({ id: `file-${++nextId}`, file }))]);
    }
    if (rejected) {
      showNotice(`${rejected.name} can’t be attached. That file type isn’t supported here.`);
    } else if (overflow) {
      showNotice(`You can attach up to ${maxFiles} files. ${overflow} weren’t added.`);
    } else if (accepted.length) {
      setAnnouncement(
        accepted.length === 1 ? `Attached ${accepted[0].name}` : `Attached ${accepted.length} files`,
      );
    }
  }

  function removeFile(id: string) {
    const list = listRef.current;
    const index = files.findIndex((f) => f.id === id);
    const removed = files[index];
    const neighbor = files[index + 1] ?? files[index - 1];
    const commit = () => {
      if (list) {
        flip.current = new Map(
          Array.from(list.querySelectorAll<HTMLElement>("[data-id]"), (el) => [el.dataset.id!, [el.offsetLeft, el.offsetTop] as [number, number]]),
        );
      }
      const node = list?.querySelector(`[data-id="${id}"]`);
      if (node?.contains(document.activeElement) || !document.activeElement || document.activeElement === document.body) {
        focusAfterRemove.current = neighbor ? neighbor.id : "textarea";
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
      if (removed) setAnnouncement(`Removed ${removed.file.name}`);
    };
    const node = list?.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!node || reducedMotion()) return commit();
    const exit = node.animate(
      { opacity: [1, 0], transform: ["none", "scale(0.97)"] },
      { duration: ms(token(node, "--ui-dur-instant", "150ms")), easing: token(node, "--ui-ease-exit", "ease-in"), fill: "forwards" },
    );
    exit.finished.then(commit, commit);
  }

  function submit() {
    if (!canSend) return;
    const result = onSubmit({ text: text.trim(), files: files.map((f) => f.file) });
    if (result === false) return;
    setText("");
    setFiles([]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && streaming) {
      // Stop the reply instead of closing whatever surrounds the composer.
      event.preventDefault();
      event.stopPropagation();
      onStop?.();
      return;
    }
    if (event.target !== textareaRef.current) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    // Enter that confirms an IME candidate (Japanese, Chinese, Korean) must
    // never send. Safari reports it as keyCode 229 after compositionend.
    if (event.nativeEvent.isComposing || event.keyCode === 229 || composing.current) return;
    event.preventDefault();
    submit();
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files);
    if (!allowFiles || pasted.length === 0) return;
    event.preventDefault();
    addFiles(pasted);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!allowFiles || disabled || !hasFiles(event)) return;
    dragDepth.current++;
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!allowFiles || !hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!allowFiles || disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!allowFiles || disabled || !hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
    textareaRef.current?.focus();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label, [role='button']")) return;
    event.preventDefault();
    focusAtEnd();
  }

  function fillSuggestion(suggestion: string) {
    caretToEnd.current = true;
    setText(suggestion);
    // Same text as before: no render will run the effect, so focus now.
    if (suggestion === text) {
      caretToEnd.current = false;
      focusAtEnd();
    }
  }

  const hintContent = hint === false ? null : hint;
  const line = Boolean(hintContent) || (hint !== false && allowFiles) || Boolean(notice);

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      style={{ "--prompt-input-rows": maxRows } as CSSProperties}
      onKeyDown={handleKeyDown}
    >
      {suggestions && suggestions.length > 0 && (
        <ul className={styles.suggestions} aria-label="Suggestions">
          {suggestions.map((s) => (
            <li key={s}>
              <button type="button" className={styles.suggestion} onClick={() => fillSuggestion(s)} disabled={disabled}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={styles.composer}
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={handlePointerDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {files.length > 0 && (
          <ul ref={listRef} className={styles.attachments} aria-label="Attachments">
            {files.map(({ id, file }) => {
              const image = file.type.startsWith("image/");
              return (
                <li key={id} data-id={id} className={styles.attachment} data-kind={image ? "image" : "file"}>
                  {image ? (
                    <Thumbnail file={file} />
                  ) : (
                    <>
                      <span className={styles.fileIcon} aria-hidden="true">
                        <FileIcon />
                      </span>
                      <span className={styles.fileText}>
                        <span className={styles.fileName} title={file.name}>
                          {file.name}
                        </span>
                        <span className={styles.fileMeta}>
                          {extension(file.name)} · {formatSize(file.size)}
                        </span>
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.remove}
                    data-remove={id}
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(id)}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={hintContent || notice ? hintId : undefined}
          disabled={disabled}
          autoFocus={autoFocus}
          enterKeyHint={streaming ? "enter" : "send"}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
        />

        <div className={styles.toolbar}>
          {allowFiles && (
            <>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Attach files"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="plus" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={accept}
                hidden
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </>
          )}
          <div className={styles.footer}>{footer}</div>
          <button
            type="button"
            className={styles.send}
            data-state={streaming ? "stop" : canSend ? "ready" : "empty"}
            aria-label={streaming ? "Stop generating" : "Send message"}
            aria-disabled={!streaming && !canSend ? true : undefined}
            disabled={disabled}
            onClick={() => {
              if (streaming) onStop?.();
              else if (canSend) submit();
              textareaRef.current?.focus();
            }}
          >
            <Icon name={streaming ? "stop" : "send"} />
            {/* The leading space in " Stop" is the gap; it grows in with the word. */}
            <span className={styles.sendLabel} aria-hidden="true">
              <TextMorph>{streaming ? " Stop" : ""}</TextMorph>
            </span>
          </button>
        </div>

        <div className={styles.dropzone} aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M8 10.5V2.75M4.75 6 8 2.75 11.25 6M2.75 10.25v1.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
          </svg>
          Drop files to attach
        </div>
      </div>

      {line && (
        <p id={hintId} className={styles.hint} data-notice={notice ? true : undefined}>
          {/* Keyed so the notice and hint crossfade. */}
          <span key={notice ?? ""} className={styles.hintText} data-swap={noticed || undefined}>
            {notice ?? hintContent}
          </span>
        </p>
      )}
      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}

function Thumbnail({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);

  // Object URLs are browser-only; setting src here keeps hydration matching.
  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, nothing to optimize
    <img
      ref={ref}
      className={styles.thumbnail}
      alt={file.name}
      width={56}
      height={56}
      draggable={false}
      onLoad={(e) => {
        e.currentTarget.dataset.loaded = "true";
      }}
    />
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16">
      <path d="M9.25 2H5a1.25 1.25 0 0 0-1.25 1.25v9.5A1.25 1.25 0 0 0 5 14h6a1.25 1.25 0 0 0 1.25-1.25V5L9.25 2Z" />
      <path d="M9.25 2v3h3" />
    </svg>
  );
}
