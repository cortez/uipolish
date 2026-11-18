"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import styles from "./dialog.module.css";

const FOCUSABLE = [
  "[autofocus]",
  "input:not([type=hidden]):not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "button:not(:disabled)",
  "a[href]",
  "[contenteditable=true]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function firstFocusable(root: Element | null) {
  if (!root) return null;
  const autofocus = root.querySelector<HTMLElement>("[autofocus]");
  if (autofocus) return autofocus;
  for (const el of root.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (!el.closest("[inert]") && el.getClientRects().length) return el;
  }
  return null;
}

/** The nearest themed subtree, so the portaled panel keeps its tokens. */
function themeRoot(el: Element | null) {
  const root = el?.closest<HTMLElement>("[data-theme]");
  return root && root !== document.documentElement ? root : undefined;
}

/* ---------- Modal ---------- */

type FocusTarget = RefObject<HTMLElement | null> | (() => HTMLElement | null);

export type ModalProps = {
  open: boolean;
  /** The user asked to close: Escape, a click on the backdrop, or your close button. */
  onDismiss: () => void;
  /** Kept for compatibility. Base UI never closes the dialog on its own, so this isn't called. */
  onForceClose?: () => void;
  /** Where focus goes when it opens. Defaults to the first control inside. */
  initialFocus?: FocusTarget;
  /** The panel grows out of this element, and focus returns to it. Defaults to whatever had focus when it opened. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Where focus goes on close when the trigger is gone (a deleted row, say). */
  finalFocus?: RefObject<HTMLElement | null>;
  /** "center" when it wasn't opened from anything on screen, like a keyboard shortcut. */
  growFrom?: "trigger" | "center";
  role?: "dialog" | "alertdialog";
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

/** Base UI's Dialog (or AlertDialog) popup over a backdrop; Escape and backdrop clicks call `onDismiss`. */
export function Modal({
  open,
  onDismiss,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onForceClose,
  initialFocus,
  triggerRef,
  finalFocus,
  growFrom = "trigger",
  role = "dialog",
  className,
  children,
  ...aria
}: ModalProps) {
  // The element that opened it, read as `open` turns true. This runs before
  // Base UI mounts the popup and moves focus inside, so the focused element is
  // still the one that opened it.
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    setTrigger(triggerRef?.current ?? (active instanceof HTMLElement && active !== document.body ? active : null));
  }, [open, triggerRef]);

  const latest = useRef({ trigger, growFrom });
  useLayoutEffect(() => {
    latest.current = { trigger, growFrom };
  });

  // Grow out of the trigger's center. The viewport is fixed at 0,0, so the
  // panel's offsets are viewport coordinates, untouched by the starting scale.
  const popupRef = useCallback((popup: HTMLDivElement | null) => {
    if (!popup) return;
    const { trigger: t, growFrom: from } = latest.current;
    // On phones the panel is docked at the bottom (dialog.module.css), so it rises from there.
    const docked = matchMedia("(max-width: 480px)").matches;
    const rect = from === "trigger" && !docked && t?.isConnected ? t.getBoundingClientRect() : null;
    popup.style.transformOrigin =
      rect && (rect.width || rect.height)
        ? `${rect.left + rect.width / 2 - popup.offsetLeft}px ${rect.top + rect.height / 2 - popup.offsetTop}px`
        : docked && from === "trigger"
          ? "50% 100%"
          : "50% 50%";
  }, []);

  const Root = role === "alertdialog" ? BaseAlertDialog.Root : BaseDialog.Root;

  return (
    <Root
      open={open}
      onOpenChange={(next) => {
        // Controlled: the owner decides, so a guard can keep it open.
        if (!next) onDismiss();
      }}
    >
      <BaseDialog.Portal container={themeRoot(trigger)}>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Viewport className={styles.viewport}>
          <BaseDialog.Popup
            ref={popupRef}
            className={className ? `${styles.modal} ${className}` : styles.modal}
            initialFocus={() => {
              const el = typeof initialFocus === "function" ? initialFocus() : initialFocus?.current;
              return el ?? true;
            }}
            finalFocus={() => {
              // Back to the trigger, unless it's gone or on its way out (inside
              // something inert, like a row being removed): then finalFocus.
              if (trigger?.isConnected && !trigger.closest("[inert]")) return trigger;
              return finalFocus?.current ?? true;
            }}
            {...aria}
          >
            {children}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </Root>
  );
}

/* ---------- Dialog ---------- */

type GuardCopy = {
  title?: string;
  description?: string;
  keep?: string;
  discard?: string;
};

type StepKey = string | number;

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** The body. With `step`, pass a function of the step so the leaving step can still render. */
  children?: ReactNode | ((step: StepKey) => ReactNode);
  /** The current step of a multi-step body. */
  step?: StepKey;
  /** Actions under the body. Put the main action last. */
  footer?: ReactNode;
  /** Unsaved edits: dismissing asks "Discard changes?" first. A function is called on each attempt. */
  dirty?: boolean | (() => boolean);
  guard?: GuardCopy;
  initialFocus?: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null>;
  /** Width: sm 420, md 480, lg 640. */
  size?: "sm" | "md" | "lg";
  role?: "dialog" | "alertdialog";
  /** Block Escape, the backdrop and the close button, e.g. while saving. */
  locked?: boolean;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  step,
  footer,
  dirty = false,
  guard,
  initialFocus,
  triggerRef,
  finalFocus,
  size = "md",
  role = "dialog",
  locked = false,
  className,
}: DialogProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const guardTitleId = `${id}-guard-title`;
  const guardTextId = `${id}-guard-text`;
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const beforeGuard = useRef<HTMLElement | null>(null);
  const [guarding, setGuarding] = useState(false);

  const [shownStep, setShownStep] = useState(step);
  const [leaving, setLeaving] = useState<{ key: StepKey; n: number } | null>(null);
  const [changes, setChanges] = useState(0);
  // Only a change made while open fades; a reset while closed is simply there next time.
  const [fades, setFades] = useState(false);
  if (shownStep !== step) {
    setShownStep(step);
    setChanges(changes + 1);
    setFades(open);
    setLeaving(shownStep !== undefined && open ? { key: shownStep, n: changes } : null);
  }

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setGuarding(false);
      setLeaving(null);
      setFades(false);
    }
  }

  // Focus lost with the leaving step goes to the new step, not the page.
  const stepRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (changes === 0) return;
    const active = document.activeElement;
    const lost = !active || active === document.body || !!active.closest("[inert]");
    if (lost) firstFocusable(stepRef.current)?.focus({ preventScroll: true });
  }, [changes]);

  const render = (key: StepKey | undefined) =>
    typeof children === "function" ? (key === undefined ? null : children(key)) : children;

  useLayoutEffect(() => {
    if (guarding) keepRef.current?.focus();
  }, [guarding]);

  function isDirty() {
    return typeof dirty === "function" ? dirty() : dirty;
  }

  function dismiss() {
    if (locked) return;
    if (guarding) {
      keepEditing();
      return;
    }
    if (isDirty()) {
      const active = document.activeElement;
      beforeGuard.current = active instanceof HTMLElement ? active : null;
      setGuarding(true);
      return;
    }
    onOpenChange(false);
  }

  function keepEditing() {
    // Commit now, so focus moves back in the same task as the guard leaves and
    // Base UI never sees focus fall out of the panel.
    flushSync(() => setGuarding(false));
    const back = beforeGuard.current;
    const target = back?.isConnected && !back.closest("[inert]") ? back : firstFocusable(bodyRef.current);
    target?.focus();
  }

  function discard() {
    setGuarding(false);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onDismiss={dismiss}
      onForceClose={() => onOpenChange(false)}
      initialFocus={() => initialFocus?.current ?? firstFocusable(bodyRef.current) ?? firstFocusable(footerRef.current)}
      triggerRef={triggerRef}
      finalFocus={finalFocus}
      role={role}
      className={className ? `${styles.dialog} ${className}` : styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Eases the panel's height when steps, messages or the guard change it. */}
      <AnimatedSize className={styles.sizer}>
        <div className={styles.frame} data-size={size} data-guarding={guarding || undefined}>
          <header className={styles.header} inert={guarding}>
            <div className={styles.heading}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" className={styles.close} aria-label="Close" onClick={dismiss}>
              <Icon name="close" />
            </Button>
          </header>

          {children && (
            <div ref={bodyRef} className={styles.body} inert={guarding}>
              {step === undefined || typeof children !== "function" ? (
                render(step)
              ) : (
                <div className={styles.steps}>
                  {leaving && (
                    <div
                      key={`step-${leaving.n}`}
                      className={styles.stepOut}
                      inert
                      aria-hidden="true"
                      onAnimationEnd={(e) => {
                        if (e.target === e.currentTarget) setLeaving((l) => (l?.n === leaving.n ? null : l));
                      }}
                    >
                      {render(leaving.key)}
                    </div>
                  )}
                  <div
                    key={`step-${changes}`}
                    ref={stepRef}
                    className={fades ? styles.stepIn : undefined}
                  >
                    {render(step)}
                  </div>
                </div>
              )}
            </div>
          )}

          {(footer || guarding) && (
            <div className={styles.footerCell}>
              {footer && (
                <div ref={footerRef} className={styles.footer} inert={guarding} aria-hidden={guarding || undefined}>
                  {footer}
                </div>
              )}
              {guarding && (
                <div
                  className={styles.guard}
                  role="group"
                  aria-labelledby={guardTitleId}
                  aria-describedby={guardTextId}
                >
                  <div className={styles.guardText}>
                    <p id={guardTitleId} className={styles.guardTitle}>
                      {guard?.title ?? "Discard changes?"}
                    </p>
                    <p id={guardTextId} className={styles.guardDescription}>
                      {guard?.description ?? "Your edits haven’t been saved."}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <Button ref={keepRef} variant="secondary" onClick={keepEditing}>
                      {guard?.keep ?? "Keep editing"}
                    </Button>
                    <Button variant="danger" onClick={discard}>
                      {guard?.discard ?? "Discard"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AnimatedSize>
    </Modal>
  );
}

/** Lays footer buttons out in a row; on phones they wrap. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/* ---------- ConfirmDialog ---------- */

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** The verb: "Delete estimate", never "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Return a promise to keep the dialog open, busy, until it settles. A rejection shows its message. */
  onConfirm: () => void | Promise<unknown>;
  tone?: "danger" | "default";
  triggerRef?: RefObject<HTMLElement | null>;
  finalFocus?: RefObject<HTMLElement | null>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "danger",
  triggerRef,
  finalFocus,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setError(null);
  }

  async function confirm() {
    setError(null);
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await result;
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      size="sm"
      title={title}
      description={description}
      locked={busy}
      initialFocus={cancelRef}
      triggerRef={triggerRef}
      finalFocus={finalFocus}
      footer={
        <>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <DialogActions>
            <Button ref={cancelRef} variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} busy={busy} onClick={confirm}>
              {confirmLabel}
            </Button>
          </DialogActions>
        </>
      }
    />
  );
}
