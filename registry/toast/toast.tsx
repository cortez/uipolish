"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./toast.module.css";

/* ---------- Store ---------- */

export type ToastType = "default" | "success" | "error" | "loading";

export type ToastAction = { label: string; onClick: () => void };

export type ToastOptions = {
  id?: string;
  description?: ReactNode;
  action?: ToastAction;
  /** Milliseconds on screen; Infinity keeps it until dismissed. */
  duration?: number;
};

type ToastData = { action?: ToastAction; morph: boolean };

/** One manager for the whole app, so `toast()` works from anywhere, outside React too. */
const manager = BaseToast.createToastManager();
let counter = 0;
// Ids whose title morphs on change (toast.promise, toast.loading); sticky across updates.
const morphing = new Set<string>();

function defaultDuration(type: ToastType, action?: ToastAction) {
  if (type === "loading") return Infinity;
  if (action) return 8000;
  return type === "error" ? 6000 : 5000;
}

function upsert(type: ToastType, title: string, options: ToastOptions = {}, morph = false) {
  const id = options.id ?? `toast-${++counter}`;
  if (morph) morphing.add(id);
  const duration = options.duration ?? defaultDuration(type, options.action);
  // Adding with an id that's already shown updates it in place and restarts its timer.
  manager.add<ToastData>({
    id,
    type,
    title,
    description: options.description,
    timeout: Number.isFinite(duration) ? duration : 0,
    priority: type === "error" ? "high" : "low",
    data: { action: options.action, morph: morphing.has(id) },
    onRemove: () => morphing.delete(id),
  });
  return id;
}

function dismiss(id?: string) {
  manager.close(id);
}

type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((reason: unknown) => string);
  /** Extra options for the settled toast. */
  successOptions?: ToastOptions;
  errorOptions?: ToastOptions;
  description?: ReactNode;
};

/** Show a toast and return its id; pass it as `id` to update the toast in place. */
export const toast = Object.assign(
  (title: string, options?: ToastOptions) => upsert("default", title, options),
  {
    success: (title: string, options?: ToastOptions) => upsert("success", title, options),
    error: (title: string, options?: ToastOptions) => upsert("error", title, options),
    loading: (title: string, options?: ToastOptions) => upsert("loading", title, options, true),
    dismiss,
    /** One toast that follows a promise from loading to success or error. */
    promise<T>(promise: Promise<T>, messages: PromiseMessages<T>, options: ToastOptions = {}) {
      const id = upsert("loading", messages.loading, { ...options, description: messages.description }, true);
      promise.then(
        (value) => {
          const title = typeof messages.success === "function" ? messages.success(value) : messages.success;
          upsert("success", title, { ...options, description: messages.description, ...messages.successOptions, id });
        },
        (reason) => {
          const title = typeof messages.error === "function" ? messages.error(reason) : messages.error;
          upsert("error", title, { ...options, description: messages.description, ...messages.errorOptions, id });
        },
      );
      return promise;
    },
  },
);

/* ---------- Layout ---------- */

const GAP = 8; // matches --ui-space-2
const PEEK = 12; // how far each collapsed toast peeks out
const SHRINK = 0.03; // scale step per collapsed toast

type Vars = CSSProperties & Record<string, string | number>;
type Place = { collapsed: Vars; expanded: Vars };
type Item = BaseToast.Root.ToastObject<ToastData>;

/** Where each live toast sits, collapsed and fanned out, plus the stack's height in both. */
function stack(toasts: Item[], max: number) {
  const live = toasts.filter((t) => t.transitionStatus !== "ending");
  const frontHeight = live[0]?.height ?? 0;
  const places: Record<string, Place> = {};
  let offset = 0;
  live.forEach((t, index) => {
    const h = t.height ?? frontHeight;
    const shared = { opacity: index < max ? 1 : 0, zIndex: live.length - index };
    const clipTop = index > 0 && h > frontHeight ? h - frontHeight : -1;
    places[t.id] = {
      collapsed: {
        ...shared,
        "--toast-y": `${-index * PEEK - Math.max(0, frontHeight - h)}px`,
        "--toast-scale": 1 - index * SHRINK,
        // Unclipped, the inset reaches past the card so its shadow isn't cut off.
        "--toast-clip":
          clipTop >= 0 ? `inset(${clipTop}px 0 0 0 round var(--toast-radius))` : "inset(-40px -40px -64px -40px round 0)",
        "--toast-content": index === 0 ? 1 : 0,
      },
      expanded: {
        ...shared,
        "--toast-y": `${-offset}px`,
        "--toast-scale": 1,
        "--toast-clip": "inset(-40px -40px -64px -40px round 0)",
        "--toast-content": 1,
      },
    };
    offset += h + GAP;
  });
  // Sized to the stack, so moving onto an older toast isn't a leave.
  const shown = live.slice(0, max);
  const height = {
    collapsed: frontHeight + Math.max(0, shown.length - 1) * PEEK,
    expanded: shown.reduce((sum, t) => sum + (t.height ?? 0) + GAP, 0),
  };
  return { places, height };
}

/* ---------- Toaster ---------- */

export type ToasterProps = {
  position?: "bottom-right" | "bottom-left";
  /** How many toasts show at once. */
  max?: number;
  /** Name of the region, read with its F6 shortcut. */
  label?: string;
};

/** Renders the toasts. Built on Base UI's Toast: it owns timers, F6, swipe and announcements. */
export function Toaster({ position = "bottom-right", max = 3, label = "Notifications" }: ToasterProps) {
  // A marker in place, so the portaled stack inherits the nearest themed subtree's tokens.
  const [host, setHost] = useState<HTMLSpanElement | null>(null);
  const themed = host?.closest<HTMLElement>("[data-theme]");
  const container = themed && themed !== document.documentElement ? themed : undefined;

  return (
    <BaseToast.Provider toastManager={manager} limit={max}>
      <span ref={setHost} hidden />
      <BaseToast.Portal container={container}>
        <Stack position={position} max={max} label={label} />
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function Stack({ position, max, label }: Required<ToasterProps>) {
  const { toasts } = BaseToast.useToastManager<ToastData>();
  const { places, height } = stack(toasts, max);

  return (
    <BaseToast.Viewport
      className={styles.region}
      data-position={position}
      aria-label={`${label} (F6)`}
      style={(state) => ({ height: state.expanded ? height.expanded : height.collapsed })}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} place={places[t.id]} />
      ))}
    </BaseToast.Viewport>
  );
}

/* ---------- One toast ---------- */

function ToastItem({ toast: item, place }: { toast: Item; place?: Place }) {
  const { id, title, description, data } = item;
  const type = (item.type ?? "default") as ToastType;
  const closing = item.transitionStatus === "ending";

  // A leaving toast keeps its last position while the rest move up.
  const key = JSON.stringify(place ?? null);
  const [kept, setKept] = useState({ key, place });
  if (!closing && place && kept.key !== key) setKept({ key, place });
  const applied = closing ? kept.place : place;

  return (
    <BaseToast.Root
      toast={item}
      swipeDirection={["left", "right"]}
      className={styles.item}
      style={(state) => {
        const vars = state.expanded ? applied?.expanded : applied?.collapsed;
        // The fade lives on the root: Base UI waits for the root's own transitions before removing it.
        return state.transitionStatus === "ending" ? { ...vars, opacity: 0 } : vars;
      }}
    >
      <div className={styles.card}>
        <div className={styles.content}>
          <span className={styles.icon} aria-hidden="true">
            <ToastIcon type={type} />
          </span>
          <div className={styles.text}>
            <BaseToast.Title className={styles.title} render={<p />}>
              {data?.morph ? <TextMorph>{String(title ?? "")}</TextMorph> : title}
            </BaseToast.Title>
            {description && <BaseToast.Description className={styles.description}>{description}</BaseToast.Description>}
          </div>
          {data?.action && (
            <Button
              variant="secondary"
              className={styles.action}
              onClick={() => {
                data.action!.onClick();
                dismiss(id);
              }}
            >
              {data.action.label}
            </Button>
          )}
          <BaseToast.Close className={styles.close} aria-label={`Dismiss: ${String(title ?? "")}`}>
            <Icon name="close" />
          </BaseToast.Close>
        </div>
      </div>
    </BaseToast.Root>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "loading") return <span className={styles.pulse} />;
  if (type === "success")
    return (
      <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
        <path className={styles.tick} d="M5.4 8.2l1.8 1.8 3.4-3.6" pathLength={1} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (type === "error")
    return (
      <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
        <path d="M8 4.75v3.75" stroke="currentColor" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.9" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" />
      <path d="M8 7.5v3.5" stroke="currentColor" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
    </svg>
  );
}
