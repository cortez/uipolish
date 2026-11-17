"use client";

import {
  createContext,
  use,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Popover } from "@base-ui/react/popover";
import { BrandMark, type BrandName } from "../brand-marks/brand-marks";
import { Icon } from "../icons/icons";
import { ScrollArea } from "../scroll-area/scroll-area";
import styles from "./sources.module.css";

export type Source = {
  title: string;
  url: string;
  /** A sentence from the page that supports the claim. */
  excerpt?: string;
  /** The site's mark from `brand-marks`, for a site in the set: `"wikipedia"`, `"reddit"`. Wins over `favicon`. */
  brand?: BrandName;
  /** Favicon URL; falls back to the domain's first letter. */
  favicon?: string;
};

type SourcesContext = {
  sources: Source[];
  active: number | null;
  setActive: (n: number | null) => void;
};

const Context = createContext<SourcesContext | null>(null);

function useSources() {
  const ctx = use(Context);
  if (!ctx)
    throw new Error("Citation and SourceList must be inside <Sources>.");
  return ctx;
}

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Shares numbering and hover state between the markers in the text and the list. */
export function Sources({
  sources,
  children,
}: {
  sources: Source[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  return <Context value={{ sources, active, setActive }}>{children}</Context>;
}

function Favicon({ source }: { source: Source }) {
  const [failed, setFailed] = useState(false);
  const domain = domainOf(source.url);
  if (source.brand) {
    return (
      <span className={styles.favicon} data-brand>
        <BrandMark name={source.brand} size={10} />
      </span>
    );
  }
  if (source.favicon && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.favicon}
        src={source.favicon}
        alt=""
        width={16}
        height={16}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <svg
      className={styles.favicon}
      data-letter
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <text
        x="8"
        y="8.5"
        fontSize="9"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {domain.charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}

function NewTabIcon() {
  return <Icon className={styles.external} name="external" />;
}

const OPEN_DELAY = 300;
const CLOSE_DELAY = 150;
// Shared across markers, so moving to the next one skips the open delay.
let lastClosed = -Infinity;
let openCards = 0;

/** An inline citation marker, `[1]` style, with a preview card on hover, focus or tap. */
export function Citation({ n }: { n: number }) {
  const { sources, active, setActive } = useSources();
  const source = sources[n - 1];
  const triggerId = useId();
  const [handle] = useState(() => Popover.createHandle());
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Read when the pointer arrives, so Base UI sees no delay right after another card closed.
  const [warm, setWarm] = useState(false);
  const escaped = useRef(false);

  if (!source) return null;

  function onOpenChange(next: boolean, reason: string) {
    if (next === open) return;
    openCards += next ? 1 : -1;
    if (!next) {
      lastClosed = performance.now();
      if (reason === "escape-key") escaped.current = true;
    }
    setOpen(next);
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    setActive(n);
    // Keyboard focus opens at once; a click is left to the click handler, and
    // focus coming back after Escape doesn't reopen it.
    if (escaped.current) escaped.current = false;
    else if (event.currentTarget.matches(":focus-visible") && !handle.isOpen) handle.open(triggerId);
  }

  function onBlur(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && (trigger?.contains(next) || cardRef.current?.contains(next))) return;
    setActive(null);
  }

  const domain = domainOf(source.url);

  return (
    <span className={styles.citation}>
      <Popover.Root handle={handle} onOpenChange={(next, details) => onOpenChange(next, details.reason)}>
        <Popover.Trigger
          ref={setTrigger}
          id={triggerId}
          openOnHover
          delay={warm ? 0 : OPEN_DELAY}
          closeDelay={CLOSE_DELAY}
          className={styles.marker}
          data-active={active === n || open || undefined}
          aria-label={`Source ${n}: ${source.title}`}
          aria-haspopup={undefined}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return;
            setActive(n);
            // Pointer events have continuous priority; flush so the delay is in place before mouseenter.
            flushSync(() => setWarm(openCards > 0 || performance.now() - lastClosed < OPEN_DELAY));
          }}
          onPointerLeave={(event) => event.pointerType === "mouse" && setActive(null)}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          {n}
        </Popover.Trigger>
        <Popover.Portal container={trigger?.closest<HTMLElement>("dialog[open], [data-theme]") ?? undefined}>
          <Popover.Positioner className={styles.positioner} side="top" sideOffset={8} collisionPadding={12}>
            <Popover.Popup
              ref={cardRef}
              className={styles.card}
              role={undefined}
              initialFocus={false}
            >
              <span className={styles.cardSite}>
                <Favicon source={source} />
                <span className={styles.cardDomain}>{domain}</span>
                <span className={styles.cardNumber} aria-hidden="true">
                  {n}
                </span>
              </span>
              <a className={styles.cardTitle} href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
                <span className={styles.srOnly}> (opens in new tab)</span>
              </a>
              {source.excerpt && <span className={styles.cardExcerpt}>{source.excerpt}</span>}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

type SourceListProps = {
  /** `disclosure`: a collapsible list. `row`: a sideways-scrolling row of chips. */
  variant?: "disclosure" | "row";
  defaultOpen?: boolean;
  className?: string;
};

/** The sources behind an answer, numbered to match the markers in the text. */
export function SourceList({
  variant = "disclosure",
  defaultOpen = false,
  className,
}: SourceListProps) {
  return variant === "row" ? (
    <SourceRow className={className} />
  ) : (
    <SourceDisclosure defaultOpen={defaultOpen} className={className} />
  );
}

function SourceLink({
  source,
  n,
  chip,
}: {
  source: Source;
  n: number;
  chip?: boolean;
}) {
  const { active, setActive } = useSources();
  return (
    <a
      className={chip ? styles.chip : styles.row}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      data-active={active === n || undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setActive(n)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      onFocus={() => setActive(n)}
      onBlur={() => setActive(null)}
    >
      <span className={styles.number}>{n}</span>
      <Favicon source={source} />
      {chip ? (
        <span className={styles.chipTitle} title={source.title}>
          {source.title}
        </span>
      ) : (
        <span className={styles.rowText}>
          <span className={styles.rowTitle}>{source.title}</span>
          <span className={styles.rowDomain}>{domainOf(source.url)}</span>
        </span>
      )}
      {!chip && <NewTabIcon />}
      <span className={styles.srOnly}> (opens in new tab)</span>
    </a>
  );
}

function SourceDisclosure({
  defaultOpen,
  className,
}: {
  defaultOpen: boolean;
  className?: string;
}) {
  const { sources } = useSources();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const count = `${sources.length} ${sources.length === 1 ? "source" : "sources"}`;

  return (
    <div
      className={className ? `${styles.list} ${className}` : styles.list}
      data-open={open}
    >
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.stack} aria-hidden="true">
          {sources.slice(0, 4).map((s, i) => (
            <Favicon key={i} source={s} />
          ))}
        </span>
        {count}
        <Icon className={styles.chevron} name="chevron-right" data-turn={open ? "open" : ""} />
      </button>
      <div id={panelId} className={styles.panel} inert={!open}>
        <div className={styles.clip}>
          <ol className={styles.rows} aria-label="Sources">
            {sources.map((s, i) => (
              <li key={s.url + i}>
                <SourceLink source={s} n={i + 1} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function SourceRow({ className }: { className?: string }) {
  const { sources } = useSources();
  function onKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>("a"),
    );
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i === -1) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[
      event.key
    ];
    let next = -1;
    if (step) next = Math.min(Math.max(i + step, 0), links.length - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = links.length - 1;
    if (next === -1) return;
    event.preventDefault();
    links[next].focus();
  }

  return (
    <ScrollArea
      orientation="horizontal"
      className={
        className ? `${styles.scroller} ${className}` : styles.scroller
      }
    >
      <ol className={styles.chips} aria-label="Sources" onKeyDown={onKeyDown}>
        {sources.map((s, i) => (
          <li key={s.url + i}>
            <SourceLink source={s} n={i + 1} chip />
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
