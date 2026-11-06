"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./accordion.module.css";

type AccordionContextValue = {
  open: string[];
  hash: boolean;
  ready: boolean;
  headingLevel: 2 | 3 | 4 | 5 | 6;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

type Common = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** Use each item's value as its heading id, so `#value` in the URL opens it. Values must be unique. */
  hash?: boolean;
  /** The heading level that wraps each trigger. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

type SingleProps = Common & {
  /** One item open at a time. Opening another closes the first. */
  type?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Whether the open item can be closed, leaving none open. */
  collapsible?: boolean;
};

type MultipleProps = Common & {
  /** Any number of items open at once. */
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  collapsible?: never;
};

type AccordionProps = SingleProps | MultipleProps;

const toArray = (v: string | string[] | null | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);

export function Accordion(props: AccordionProps) {
  const {
    type = "single",
    value: controlledValue,
    defaultValue,
    onValueChange,
    collapsible = true,
    hash = false,
    headingLevel = 3,
    className,
    children,
    ...rest
  } = props as SingleProps & { type?: "single" | "multiple"; value?: string | string[] | null; defaultValue?: string | string[] | null; onValueChange?: (v: string | string[] | null) => void };

  const baseId = useId();
  const [uncontrolled, setUncontrolled] = useState<string[]>(() => toArray(defaultValue));
  const controlled = controlledValue !== undefined;
  const open = controlled ? toArray(controlledValue) : uncontrolled;
  const single = type === "single";

  const setOpen = useCallback(
    (next: string[]) => {
      if (!controlled) setUncontrolled(next);
      onValueChange?.(single ? (next[0] ?? null) : next);
    },
    [controlled, onValueChange, single],
  );

  // Nothing animates until the first paint, so an item opened by the URL is simply open.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  useLayoutEffect(() => {
    openRef.current = open;
  });
  useLayoutEffect(() => {
    if (!hash) return;
    function sync() {
      const target = decodeURIComponent(window.location.hash.slice(1));
      const heading = target ? rootRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(target)}"]`) : null;
      if (!heading || openRef.current.includes(target)) return;
      setOpen(single ? [target] : [...openRef.current, target]);
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [hash, single, setOpen]);

  // True only for a server-rendered page: React won't run a script it renders
  // itself on the client.
  const fromServer = useSyncExternalStore(subscribeNever, clientSnapshot, serverSnapshot);

  return (
    <AccordionContext value={{ open, hash, ready, headingLevel }}>
      <BaseAccordion.Root
        ref={rootRef}
        // Always controlled here, so `hash` and `collapsible` can steer it.
        value={open}
        onValueChange={(next: string[]) => {
          if (single && !collapsible && next.length === 0) return;
          setOpen(next);
        }}
        multiple={!single}
        // Closed panels stay in the DOM for the closing animation.
        keepMounted
        data-ready={ready || undefined}
        data-type={type}
        className={className ? `${styles.root} ${className}` : styles.root}
        data-accordion={baseId}
        {...rest}
      >
        {hash && fromServer && (
          // Opens the URL's item before first paint. CSS :target alone can lose
          // that race: the browser may set the target only after painting once.
          <script dangerouslySetInnerHTML={{ __html: hashScript(baseId, single) }} />
        )}
        {children}
      </BaseAccordion.Root>
    </AccordionContext>
  );
}

const subscribeNever = () => () => {};
const clientSnapshot = () => false;
const serverSnapshot = () => true;

function hashScript(id: string, single: boolean) {
  return `(function(){var h=decodeURIComponent(location.hash.slice(1));if(!h||!document.adoptedStyleSheets||!window.CSS)return;var r='[data-accordion="'+CSS.escape(${JSON.stringify(id)})+'"]:not([data-ready]) [data-accordion-item]',v=':has(> [data-value="'+CSS.escape(h)+'"]) > [data-accordion-panel]',s=new CSSStyleSheet();s.replaceSync(r+v+'{display:block;height:auto;opacity:1}'+(${single}?r+':not('+v.slice(0,v.indexOf(' > [data-accordion-panel]'))+') > [data-accordion-panel]{height:0;opacity:0}':''));document.adoptedStyleSheets=document.adoptedStyleSheets.concat(s)})()`;
}

type AccordionItemProps = Omit<ComponentProps<"div">, "title"> & {
  value: string;
  /** The question or section name; the button's label. */
  title: ReactNode;
  /** A short value at the end of the row ("3 active"), read as part of the button's name. */
  meta?: ReactNode;
  disabled?: boolean;
};

export function AccordionItem({ value, title, meta, disabled = false, className, children, ...props }: AccordionItemProps) {
  const context = use(AccordionContext);
  if (!context) throw new Error("<AccordionItem> must be inside <Accordion>.");
  const { open: openValues, hash, ready, headingLevel } = context;
  const open = openValues.includes(value);
  const Heading = `h${headingLevel}` as const;
  const hasMeta = meta != null && meta !== false && meta !== "";

  return (
    <BaseAccordion.Item
      value={value}
      disabled={disabled}
      data-accordion-item=""
      className={className ? `${styles.item} ${className}` : styles.item}
      {...props}
    >
      <BaseAccordion.Header
        render={(headerProps) => <Heading {...headerProps} />}
        className={styles.heading}
        id={hash ? value : undefined}
        data-value={value}
      >
        <BaseAccordion.Trigger className={styles.trigger} data-meta={hasMeta || undefined}>
          <span className={styles.title}>
            {title}
            {/* Screen-reader-only pause: "Webhooks, Not set", not run together. */}
            {hasMeta && <span className={styles.pause}>,</span>}
          </span>
          {hasMeta && (
            <span className={styles.meta}>
              {/* A short value morphs; a long one stays text, so it can wrap in a narrow row. */}
              {typeof meta === "string" && meta.length <= 20 ? <TextMorph>{meta}</TextMorph> : meta}
            </span>
          )}
          {/* Remounted after first paint so a URL-opened item doesn't animate its chevron. */}
          <Icon key={String(ready)} name={open ? "chevron-up" : "chevron-down"} className={styles.chevron} />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
      <BaseAccordion.Panel
        data-accordion-panel=""
        className={styles.panel}
        // Closed content stays in the DOM for the animation but can't be focused or read.
        inert={!open || undefined}
      >
        <div className={styles.content}>{children}</div>
      </BaseAccordion.Panel>
    </BaseAccordion.Item>
  );
}
