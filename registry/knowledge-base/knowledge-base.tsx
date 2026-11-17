"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { Alert } from "../alert/alert";
import { BatchProgress, type BatchItem } from "../batch-progress/batch-progress";
import { Button } from "../button/button";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { AddSources, useFileDrop } from "./add-sources";
import {
  extensionOf,
  formatBytes,
  isRunning,
  plural,
  useAction,
  useAnnouncer,
  useFormatters,
  cx,
  type Formatters,
  type KnowledgeBatch,
  type KnowledgeService,
  type KnowledgeSource,
  type KnowledgeTestResult,
  type KnowledgeUsage,
  type Result,
} from "./shared";
import { SourceList } from "./source-list";
import { TestPanel } from "./test-panel";
import styles from "./knowledge-base.module.css";

export type {
  KnowledgeBatch,
  KnowledgeChunk,
  KnowledgeService,
  KnowledgeSource,
  KnowledgeSourceKind,
  KnowledgeStatus,
  KnowledgeTestResult,
  KnowledgeUsage,
} from "./shared";

export type KnowledgeBaseProps = {
  /** Everything the agent answers from, in the order to list them (newest first reads best). */
  sources: KnowledgeSource[];
  /** What the plan allows. Leave out to drop the meter. */
  usage?: KnowledgeUsage;
  /** Files added together and still being read, or just finished: shown on one sheet above the list. */
  batch?: KnowledgeBatch;

  /** Apps offered under "Connect an app". Default all three. */
  services?: KnowledgeService[];
  /** Apps already connected, with the account: `{ googledrive: "mara@saturdaysupper.co" }`. */
  connected?: Partial<Record<KnowledgeService, string>>;
  /** As on a file input. Default ".pdf,.docx,.md,.csv". */
  accept?: string;
  /** Plain words for `accept`. Default "PDF, DOCX, Markdown or CSV". */
  acceptLabel?: string;
  /** Largest file, in bytes. Default 50 MB. */
  maxFileSize?: number;

  /** Files that passed the checks (type, size, not a duplicate). Resolve once they're in `sources`, queued. */
  onAddFiles?: (files: File[]) => Result;
  /** A file with the same name as one already here: replace that source with it. Leave out and duplicates are only skipped. */
  onReplaceFile?: (sourceId: string, file: File) => Result;
  /** A page or sitemap address, normalized to https. `crawl`: follow links on the same site. */
  onAddWebsite?: (url: string, options: { crawl: boolean }) => Result;
  /** Open the app's sign-in and folder picker. Resolve once its sources are in `sources`. */
  onConnect?: (service: KnowledgeService) => Result;
  /** Read a ready source again: a changed file, a site or folder with new pages. */
  onResync?: (id: string) => Result;
  /** Read failed sources again. One id from a row, several from the batch sheet. */
  onRetry?: (ids: string[]) => Result;
  /** After the person confirms. Resolve once it's gone from `sources`. */
  onRemove?: (id: string) => Result;
  /** Shows Stop on the batch sheet while it runs. */
  onStopBatch?: () => void;

  /** Run retrieval for a test question. Leave out to drop the test panel. */
  onTest?: (question: string) => Promise<KnowledgeTestResult>;
  /** Questions to try, one tap each: what your users actually ask. */
  testSuggestions?: string[];
  /** Shows "Upgrade plan" when the plan is full. */
  onUpgrade?: () => void;

  /** The viewer can test but not change anything: why, and who can. */
  readOnly?: string;
  /** Show "Loading sources…" in the space the screen will take. */
  loading?: boolean;
  /** The screen couldn't load: what went wrong, in a sentence. */
  error?: string;
  onReload?: () => void;

  /** The agent's name, for sentences: "Copper stops answering from it." Default "Your agent". */
  agentName?: string;
  /** Treated as now for "Synced 2 hours ago": ISO time or ms. Default: when the block mounts. */
  now?: string | number;
  /** Fixed so server and browser format alike. Default "en-US". */
  locale?: string;
  /** Rows before "Show n more". Default 12. */
  pageSize?: number;
  /** Default "Knowledge base". */
  title?: ReactNode;
  description?: ReactNode;
  /** The title's level; sections are one below. Default 1. */
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
};

type Rejection = { key: string; file: File; reason: string; duplicateOf?: string };

function Heading({ level, ...props }: { level: number; id?: string; className?: string; tabIndex?: number; ref?: Ref<HTMLHeadingElement>; children: ReactNode }) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h2";
  return <Tag {...props} />;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/* ---------- Usage ---------- */

/** The plan meter. At the limit, the banner above the screen carries the way out, so this only says so. */
function UsageCard({ usage, f, canUpgrade }: { usage: KnowledgeUsage; f: Formatters; canUpgrade: boolean }) {
  const id = useId();
  const unit = usage.unit ?? "pages";
  const fraction = usage.limit > 0 ? usage.used / usage.limit : 0;
  const tone = fraction >= 1 ? "full" : fraction >= 0.8 ? "warning" : "calm";
  const left = Math.max(0, usage.limit - usage.used);
  const line =
    tone === "full"
      ? `Full. New sources wait until you remove some${canUpgrade ? " or upgrade" : ""}.`
      : tone === "warning"
        ? `${f.number(left)} ${unit} left. A long PDF may not fit.`
        : `${f.number(left)} ${unit} left on your plan.`;
  return (
    <div className={styles.usage} data-tone={tone}>
      <div className={styles.usageHead}>
        <span id={`${id}-label`} className={styles.usageLabel}>
          Plan usage
        </span>
        <span className={styles.usageValue}>
          {f.number(usage.used)} of {f.number(usage.limit)} {unit}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-line`}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={Math.min(usage.used, usage.limit)}
        aria-valuetext={`${f.number(usage.used)} of ${f.number(usage.limit)} ${unit} used`}
        className={styles.usageTrack}
      >
        <span className={styles.usageFill} style={{ "--kb-used": Math.min(fraction, 1) } as CSSProperties} />
      </div>
      <p id={`${id}-line`} className={styles.usageLine}>
        {tone !== "calm" && <Icon name={tone === "full" ? "alert" : "warning"} className={styles.inlineIcon} />}
        <span>{line}</span>
      </p>
    </div>
  );
}

/* ---------- Screen ---------- */

/** The screen where a team gives its AI agent documents to answer from: add, watch them ingest, fix failures, and test retrieval. */
export function KnowledgeBase({
  sources,
  usage,
  batch,
  services = ["googledrive", "notion", "dropbox"],
  connected = {},
  accept = ".pdf,.docx,.md,.csv",
  acceptLabel = "PDF, DOCX, Markdown or CSV",
  maxFileSize = 50_000_000,
  onAddFiles,
  onReplaceFile,
  onAddWebsite,
  onConnect,
  onResync,
  onRetry,
  onRemove,
  onStopBatch,
  onTest,
  testSuggestions,
  onUpgrade,
  readOnly,
  loading = false,
  error,
  onReload,
  agentName = "Your agent",
  now: nowProp,
  locale = "en-US",
  pageSize = 12,
  title = "Knowledge base",
  description,
  headingLevel = 1,
  className,
}: KnowledgeBaseProps) {
  const baseId = useId().replace(/:/g, "");
  const [mountedAt] = useState(() => Date.now());
  const now = nowProp === undefined ? mountedAt : typeof nowProp === "number" ? nowProp : new Date(nowProp).getTime();
  const f = useFormatters(locale, now);
  const { text: announcement, announce } = useAnnouncer();
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [uploading, setUploading] = useState(0);
  const upload = useAction();
  const lastFiles = useRef<File[]>([]);

  const level = headingLevel;
  const locked = !!readOnly;
  const agent = agentName;
  const full = !!usage && usage.limit > 0 && usage.used >= usage.limit;
  const canAdd = !locked && !!(onAddFiles || onAddWebsite || onConnect);
  const firstRun = sources.length === 0;

  /* ----- Files in: check, then hand on ----- */

  const accepted = accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  const fits = (file: File) => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return accepted.length === 0 || accepted.some((a) => (a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a));
  };

  async function addFiles(files: File[]): Promise<boolean> {
    if (!onAddFiles || locked || full || uploading) return false;
    const existing = new Map(sources.filter((s) => s.kind === "file").map((s) => [s.name.toLocaleLowerCase(), s]));
    const seen = new Set<string>();
    const ok: File[] = [];
    const rejected: Rejection[] = [];
    for (const file of files) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
      const lower = file.name.toLocaleLowerCase();
      const ext = extensionOf(file.name);
      const dup = existing.get(lower);
      if (!fits(file))
        rejected.push({
          key,
          file,
          reason: ext ? `.${ext} files can’t be read. Save it as ${acceptLabel.replace(/ or /, ", or ")} and add it again.` : `This file has no type. Save it as ${acceptLabel} and add it again.`,
        });
      else if (file.size > maxFileSize) rejected.push({ key, file, reason: `Too large at ${formatBytes(file.size)}. Up to ${formatBytes(maxFileSize)}: split it, or export just the pages that matter.` });
      else if (file.size === 0) rejected.push({ key, file, reason: "This file is empty." });
      else if (dup)
        rejected.push({
          key,
          file,
          duplicateOf: dup.id,
          reason: `Already here${dup.syncedAt ? `, synced ${f.ago(dup.syncedAt)}` : ""}.${onReplaceFile ? " Replace it if this copy is newer." : ""}`,
        });
      else if (seen.has(lower)) continue;
      else {
        seen.add(lower);
        ok.push(file);
      }
    }
    setRejections(rejected);
    if (rejected.length) {
      announce(
        rejected.length === 1
          ? `${rejected[0].file.name} wasn’t added. ${rejected[0].reason}`
          : `${rejected.length} files weren’t added. They’re listed above the sources.`,
      );
    }
    if (!ok.length) return false;
    lastFiles.current = ok;
    setUploading(ok.length);
    const done = await upload.run(() => onAddFiles(ok), `${ok.length === 1 ? ok[0].name : `${ok.length} files`} didn’t upload. Check your connection and try again.`);
    setUploading(0);
    if (done) announce(`${ok.length} ${plural(ok.length, "file")} added. ${cap(agent)} starts reading ${ok.length === 1 ? "it" : "them"} now.`);
    return done;
  }

  const listDrop = useFileDrop((files) => void addFiles(files), !!onAddFiles && !locked && !full && !firstRun);

  /* ----- Loading and error take the whole screen ----- */

  const header = (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <Heading level={level} className={styles.title}>
          {title}
        </Heading>
        {description && <p className={styles.lede}>{description}</p>}
      </div>
      {canAdd && !firstRun && !loading && !error && (
        <Button
          variant={panelOpen ? "secondary" : "primary"}
          className={styles.addToggle}
          aria-expanded={panelOpen}
          aria-controls={`${baseId}-add`}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <span className={styles.plus} data-open={panelOpen || undefined}>
            <Icon name="plus" />
          </span>
          Add sources
        </Button>
      )}
    </header>
  );

  if (loading || error) {
    return (
      <div className={cx(styles.root, className)} aria-busy={loading || undefined}>
        {header}
        <div className={styles.placeholder}>
          {loading ? (
            <p className={styles.loadingLine}>
              <span className={styles.sweep}>Loading sources…</span>
            </p>
          ) : (
            <EmptyState
              art="unplugged"
              title="Sources didn’t load"
              description={error}
              titleAs="p"
              action={
                onReload && (
                  <Button variant="secondary" onClick={onReload}>
                    Try again
                  </Button>
                )
              }
            />
          )}
        </div>
      </div>
    );
  }

  /* ----- Pieces ----- */

  const blocked = full ? (
    <p className={styles.blockedLine}>
      <Icon name="alert" className={styles.inlineIcon} />
      <span>
        The plan’s {f.number(usage!.limit)} {usage!.unit ?? "pages"} are used. Remove a source{onUpgrade ? " or upgrade" : ""} to add more.
      </span>
    </p>
  ) : undefined;

  const addSources = (cardLevel: number) => (
    <AddSources
      onFiles={onAddFiles ? addFiles : undefined}
      uploading={uploading}
      accept={accept}
      acceptLabel={acceptLabel}
      maxFileSize={maxFileSize}
      onAddWebsite={onAddWebsite}
      onConnect={onConnect}
      services={services}
      connected={connected}
      blocked={blocked}
      agent={agent}
      announce={announce}
      headingLevel={cardLevel}
    />
  );

  const notices = (
    <>
      {upload.error && (
        <Alert
          tone="error"
          title="Upload failed"
          actions={
            <Button variant="secondary" onClick={() => void addFiles(lastFiles.current)}>
              Try again
            </Button>
          }
          onDismiss={() => upload.setError(null)}
        >
          <p>{upload.error}</p>
        </Alert>
      )}
      {rejections.length > 0 && (
        <Alert
          tone="warning"
          title={rejections.length === 1 ? `${rejections[0].file.name} wasn’t added` : `${rejections.length} files weren’t added`}
          onDismiss={() => setRejections([])}
        >
          <ul className={styles.rejects}>
            {rejections.map((r) => (
              <RejectRow
                key={r.key}
                rejection={r}
                single={rejections.length === 1}
                onReplace={
                  r.duplicateOf && onReplaceFile && !full
                    ? () => onReplaceFile(r.duplicateOf!, r.file)
                    : undefined
                }
                onDone={() => {
                  setRejections((list) => list.filter((x) => x.key !== r.key));
                  announce(`${r.file.name} replaced. ${cap(agent)} reads the new copy now.`);
                }}
              />
            ))}
          </ul>
        </Alert>
      )}
    </>
  );

  const batchItems: BatchItem[] = (batch?.sourceIds ?? [])
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is KnowledgeSource => !!s)
    .map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status === "ready" ? "done" : s.status === "failed" ? "failed" : s.status === "queued" ? "queued" : "working",
      error: s.error,
    }));

  const ready = sources.filter((s) => s.status === "ready");
  const failedCount = sources.filter((s) => s.status === "failed").length;
  const workingCount = sources.filter((s) => isRunning(s.status)).length;
  const chunkTotal = ready.reduce((n, s) => n + (s.chunks ?? 0), 0);
  const summary = [
    `${f.number(ready.length)} ready`,
    workingCount ? `${f.number(workingCount)} in progress` : null,
    failedCount ? `${f.number(failedCount)} failed` : null,
    chunkTotal ? `${f.number(chunkTotal)} ${plural(chunkTotal, "chunk")} to search` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const testTitleId = `${baseId}-test`;
  const testUnavailable = ready.length === 0 ? `Testing opens once a source is ready. ${cap(agent)} only answers from sources that are.` : undefined;

  /* ----- Screen ----- */

  return (
    <div className={cx(styles.root, className)}>
      {header}

      <div className={styles.banners}>
        {readOnly && (
          <Alert tone="info" title="You can test the knowledge base, not change it">
            <p>{readOnly}</p>
          </Alert>
        )}
        {full && !locked && (
          <Alert
            tone="warning"
            title={`${cap(agent)}’s knowledge base is full`}
            actions={
              onUpgrade && (
                <Button variant="primary" onClick={onUpgrade}>
                  Upgrade plan
                </Button>
              )
            }
          >
            <p>
              All {f.number(usage!.limit)} {usage!.unit ?? "pages"} on your plan are in use. Sources already here keep working; new ones can’t be added until you remove some
              {onUpgrade ? " or upgrade" : ""}.
            </p>
          </Alert>
        )}
      </div>

      {firstRun ? (
        <div className={styles.firstRun}>
          {canAdd ? (
            <>
              <div className={styles.firstRunText}>
                <Heading level={level + 1} className={styles.sectionTitle}>
                  Give {agent} something to answer from
                </Heading>
                <p className={styles.intro}>
                  {cap(agent)} answers from these sources and nothing else, and says so when they don’t cover a question. Start with what guests ask about most.
                </p>
              </div>
              {notices}
              {addSources(level + 2)}
            </>
          ) : (
            <div className={styles.placeholder}>
              <EmptyState
                art="folder"
                title="Nothing here yet"
                description={`${cap(agent)} has no sources to answer from. ${readOnly ? "Someone who can edit the knowledge base needs to add them." : ""}`.trim()}
                titleAs="p"
              />
            </div>
          )}
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.main}>
            {canAdd && (
              <div
                id={`${baseId}-add`}
                className={styles.panel}
                data-open={panelOpen || undefined}
                inert={!panelOpen || undefined}
                role="region"
                aria-label="Add sources"
              >
                <div className={styles.panelClip}>
                  <div className={styles.panelInner}>{addSources(level + 2)}</div>
                </div>
              </div>
            )}

            {notices}

            {batchItems.length > 0 && (
              <BatchProgress
                className={styles.batch}
                items={batchItems}
                verb={{ running: "Reading", done: "Added" }}
                noun={{ one: "file", other: "files" }}
                startedAt={batch?.startedAt}
                finishedAt={batch?.finishedAt}
                onStop={onStopBatch}
                onRetry={onRetry && !locked ? (ids) => void onRetry(ids) : undefined}
                visibleRows={0}
              />
            )}

            <section
              className={styles.sources}
              aria-labelledby={`${baseId}-sources`}
              data-dragging={listDrop.dragging || undefined}
              data-drop-target=""
              {...listDrop.handlers}
            >
              <div className={styles.sectionHead}>
                <Heading level={level + 1} id={`${baseId}-sources`} ref={listHeadingRef} tabIndex={-1} className={styles.sectionTitle}>
                  Sources
                </Heading>
                <p className={styles.intro}>{summary}</p>
              </div>
              <SourceList
                sources={sources}
                f={f}
                agent={cap(agent)}
                locked={locked}
                onResync={onResync}
                onRetry={onRetry}
                onRemove={onRemove}
                announce={announce}
                headingRef={listHeadingRef}
                pageSize={pageSize}
              />
              <div className={styles.dropOverlay} aria-hidden="true">
                <span className={styles.dropOverlayText}>
                  <Icon name="upload" />
                  Drop to add to {agent}’s knowledge
                </span>
              </div>
            </section>
          </div>

          {(usage || onTest) && (
            <aside className={styles.aside} aria-label="Usage and testing">
              {usage && <UsageCard usage={usage} f={f} canUpgrade={!!onUpgrade && !locked} />}
              {onTest && (
                <TestPanel
                  onTest={onTest}
                  sources={sources}
                  suggestions={testSuggestions}
                  unavailable={testUnavailable}
                  agent={cap(agent)}
                  f={f}
                  announce={announce}
                  headingLevel={level + 1}
                  titleId={testTitleId}
                />
              )}
            </aside>
          )}
        </div>
      )}

      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function RejectRow({
  rejection: r,
  single,
  onReplace,
  onDone,
}: {
  rejection: Rejection;
  single: boolean;
  onReplace?: () => Result;
  onDone: () => void;
}) {
  const { busy, error, run } = useAction();
  return (
    <li className={styles.reject}>
      <span className={styles.rejectText}>
        {!single && <span className={styles.rejectName}>{r.file.name}</span>}
        <span className={styles.rejectReason}>{r.reason}</span>
        {error && <span className={styles.rejectError}>{error}</span>}
      </span>
      {onReplace && (
        <Button
          variant="secondary"
         
          busy={busy}
          busyLabel="Replacing…"
          aria-label={`Replace ${r.file.name}`}
          onClick={async () => {
            if (await run(onReplace, "It wasn’t replaced. Try again.")) onDone();
          }}
        >
          Replace
        </Button>
      )}
    </li>
  );
}
