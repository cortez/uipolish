"use client";

import { useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { BrandMark } from "../brand-marks/brand-marks";
import { Button } from "../button/button";
import { useDelayedBusy } from "../button/use-delayed-busy";
import { Checkbox } from "../checkbox/checkbox";
import { Icon } from "../icons/icons";
import { TextField } from "../text-field/text-field";
import { SERVICES, cx, formatBytes, useAction, type KnowledgeService, type Result } from "./shared";
import styles from "./knowledge-base.module.css";

/* ---------- Drag and drop ---------- */

/** Counts enter and leave on every child, so the highlight doesn't flicker while a file moves across. */
export function useFileDrop(onFiles: (files: File[]) => void, enabled: boolean) {
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  return {
    dragging,
    handlers: {
      onDragEnter: (e: DragEvent) => {
        if (!enabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current++;
        setDragging(true);
      },
      onDragOver: (e: DragEvent) => {
        if (enabled && hasFiles(e)) e.preventDefault();
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      },
      onDrop: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        // Stops a zone inside a drop area from adding the same files twice.
        e.stopPropagation();
        depth.current = 0;
        setDragging(false);
        if (enabled && e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
      },
    },
  };
}

/* ---------- The three ways in ---------- */

type AddSourcesProps = {
  /** Validates, then hands the accepted files on. Resolves once they're added. */
  onFiles?: (files: File[]) => Promise<boolean>;
  /** A pending upload's file count, for "Uploading 3 files…". 0 when idle. */
  uploading: number;
  /** As on a file input: ".pdf,.docx,.md,.csv". */
  accept: string;
  /** Plain words for `accept`. */
  acceptLabel: string;
  maxFileSize?: number;
  onAddWebsite?: (url: string, options: { crawl: boolean }) => Result;
  onConnect?: (service: KnowledgeService) => Result;
  services: KnowledgeService[];
  connected: Partial<Record<KnowledgeService, string>>;
  /** Adding is off: why, in a sentence, and what fixes it. */
  blocked?: ReactNode;
  agent: string;
  announce: (line: string) => void;
  headingLevel: number;
};

function Heading({ level, ...props }: { level: number; id?: string; className?: string; children: ReactNode }) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h3";
  return <Tag {...props} />;
}

/** Upload, a website, or a connected app: the three ways to give the agent something to read. */
export function AddSources({
  onFiles,
  uploading,
  accept,
  acceptLabel,
  maxFileSize,
  onAddWebsite,
  onConnect,
  services,
  connected,
  blocked,
  agent,
  announce,
  headingLevel,
}: AddSourcesProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const off = !!blocked;
  const drop = useFileDrop((files) => void onFiles?.(files), !off && !!onFiles);
  const busyShown = useDelayedBusy(uploading > 0);

  const constraints = [acceptLabel, maxFileSize !== undefined && `up to ${formatBytes(maxFileSize)} each`].filter(Boolean).join(", ");

  return (
    <div className={styles.addGrid}>
      {blocked && <div className={styles.blocked}>{blocked}</div>}

      {onFiles && (
        <section className={cx(styles.addCard, styles.addUpload)} aria-labelledby={`${id}-upload`}>
          <Heading level={headingLevel} id={`${id}-upload`} className={styles.addTitle}>
            Upload files
          </Heading>
          <div
            className={styles.zone}
            data-dragging={drop.dragging || undefined}
            data-disabled={off || undefined}
            data-drop-target=""
            {...drop.handlers}
          >
            <input
              ref={inputRef}
              type="file"
              className={styles.hiddenInput}
              accept={accept}
              multiple
              disabled={off}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const files = e.currentTarget.files ? [...e.currentTarget.files] : [];
                // The same file can be picked again after it's removed.
                e.currentTarget.value = "";
                if (files.length) void onFiles(files);
              }}
            />
            <button
              type="button"
              className={styles.browse}
              disabled={off}
              aria-describedby={`${id}-constraints`}
              aria-busy={uploading > 0 || undefined}
              onClick={() => {
                if (uploading === 0) inputRef.current?.click();
              }}
            >
              <span className={styles.browseMark} aria-hidden="true">
                <Icon name="upload" />
              </span>
              {/* Every line the prompt can say sits in one cell, so trading them moves nothing. */}
              <span className={styles.browseSlot}>
                <span className={styles.browseLine} data-on={(!drop.dragging && !busyShown) || undefined} aria-hidden={drop.dragging || busyShown}>
                  Drop files here or <span className={styles.browseLink}>browse</span>
                </span>
                <span className={styles.browseLine} data-on={(drop.dragging && !busyShown) || undefined} aria-hidden={!drop.dragging}>
                  Drop to add them to {agent}’s knowledge
                </span>
                <span className={styles.browseLine} data-on={busyShown || undefined} aria-hidden={!busyShown}>
                  <span className={styles.sweep}>
                    Uploading {uploading} {uploading === 1 ? "file" : "files"}…
                  </span>
                </span>
              </span>
              <span id={`${id}-constraints`} className={styles.browseHint}>
                {constraints}
              </span>
            </button>
          </div>
        </section>
      )}

      {onAddWebsite && <WebsiteForm id={id} level={headingLevel} off={off} onAdd={onAddWebsite} announce={announce} />}

      {onConnect && services.length > 0 && (
        <section className={styles.addCard} aria-labelledby={`${id}-apps`}>
          <Heading level={headingLevel} id={`${id}-apps`} className={styles.addTitle}>
            Connect an app
          </Heading>
          <ul className={styles.apps}>
            {services.map((s) => (
              <AppRow key={s} service={s} account={connected[s]} off={off} onConnect={onConnect} announce={announce} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** "acme.co/help" → "https://acme.co/help". Null when it isn't a web address. */
export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function WebsiteForm({
  id,
  level,
  off,
  onAdd,
  announce,
}: {
  id: string;
  level: number;
  off: boolean;
  onAdd: (url: string, options: { crawl: boolean }) => Result;
  announce: (line: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [crawl, setCrawl] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const { busy, error, setError, run } = useAction();
  const fieldRef = useRef<HTMLInputElement>(null);
  const sitemap = /sitemap[^/]*\.xml(\?.*)?$/i.test(url.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || off) return;
    const normal = normalizeUrl(url);
    if (!normal) {
      setInvalid(url.trim() ? "That isn’t a web address. Try one like acme.co/help." : "Enter a page or sitemap address.");
      fieldRef.current?.focus();
      return;
    }
    const ok = await run(() => onAdd(normal, { crawl: sitemap || crawl }), "That site couldn’t be added. Try again.");
    if (ok) {
      setUrl("");
      announce(`${new URL(normal).hostname} added. Reading starts shortly.`);
    } else fieldRef.current?.focus();
  }

  return (
    <section className={styles.addCard} aria-labelledby={`${id}-site`}>
      <Heading level={level} id={`${id}-site`} className={styles.addTitle}>
        Add a website
      </Heading>
      <form className={styles.siteForm} onSubmit={submit} noValidate>
        <TextField
          ref={fieldRef}
          label="Page or sitemap address"
          placeholder="acme.co/help"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={url}
          disabled={off}
          error={invalid ?? error}
          hint={sitemap ? "Every page the sitemap lists is read." : "Help pages, a FAQ, your menus online."}
          onChange={(e) => {
            setUrl(e.currentTarget.value);
            setInvalid(null);
            if (error) setError(null);
          }}
        />
        <Checkbox
          label="Follow links to other pages on this site"
          description="Up to 200 pages, same address only."
          checked={sitemap || crawl}
          disabled={off || sitemap}
          onCheckedChange={setCrawl}
        />
        <div className={styles.siteAction}>
          <Button type="submit" variant="secondary" busy={busy} busyLabel="Checking site…" disabled={off}>
            Add website
          </Button>
        </div>
      </form>
    </section>
  );
}

function AppRow({
  service,
  account,
  off,
  onConnect,
  announce,
}: {
  service: KnowledgeService;
  account?: string;
  off: boolean;
  onConnect: (service: KnowledgeService) => Result;
  announce: (line: string) => void;
}) {
  const { busy, error, run } = useAction();
  const info = SERVICES[service];
  const id = useId();

  async function connect() {
    const ok = await run(() => onConnect(service), `${info.title} didn’t connect. Try again.`);
    if (ok) announce(account ? `Added from ${info.title}.` : `${info.title} connected.`);
  }

  return (
    <li className={styles.app}>
      <span className={styles.appMark} aria-hidden="true">
        <BrandMark name={service} size={18} />
      </span>
      <span className={styles.appText}>
        <span id={`${id}-name`} className={styles.appName}>
          {info.title}
        </span>
        <span className={styles.appLine}>
          {account ? (
            <>
              <span className={styles.appOk}>
                <Icon name="check" />
              </span>
              Connected as {account}
            </>
          ) : (
            info.what
          )}
        </span>
        {error && (
          <span className={styles.appError} role="alert">
            {error}
          </span>
        )}
      </span>
      <Button
        variant="secondary"
        className={styles.appButton}
        busy={busy}
        busyLabel={account ? "Opening…" : "Connecting…"}
        disabled={off}
        aria-describedby={`${id}-name`}
        onClick={connect}
      >
        {account ? `Add a ${info.noun}` : "Connect"}
      </Button>
    </li>
  );
}
