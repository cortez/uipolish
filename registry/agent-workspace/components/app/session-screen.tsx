"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { NavRail } from "@/components/ui/nav-rail/nav-rail";
import { Icon } from "@/components/ui/icons/icons";
import type { Session } from "@/lib/coding/session";
import { ChangesPanel } from "./changes-panel";
import { NewSession } from "./new-session";
import { RunPanel } from "./run-panel";
import { SessionComposer } from "./session-composer";
import { SessionMissing } from "./session-missing";
import { SessionThread } from "./session-thread";
import { SessionTopBar } from "./session-top-bar";
import { useSession } from "./use-session";
import { useStored } from "./use-stored";
import text from "@/components/ui/text/text.module.css";
import styles from "./workspace.module.css";

/* One session, in the three panes: the conversation and its composer in
   the middle, the pull request and its files on the right (resizable, and
   folded away with ⌘.), and the run panel under them. On a phone the panes
   take turns, picked from a bar along the bottom. sessionId null is a new
   session. */

type Pane = "chat" | "changes" | "run";

const PANEL = { min: 320, max: 560, initial: 400, step: 24 };

type PanelState = { open: boolean; width: number };

function parsePanel(raw: unknown): PanelState | null {
  if (!raw || typeof raw !== "object") return null;
  const { open, width } = raw as Partial<PanelState>;
  return { open: open !== false, width: clampWidth(typeof width === "number" ? width : PANEL.initial) };
}

const clampWidth = (w: number) => Math.round(Math.min(PANEL.max, Math.max(PANEL.min, w)));

/** The conversation needs about this much beside the changes pane; narrower, the panes take turns. */
const CENTER_MIN = 420;

/** Whether the screen is too narrow for side-by-side panes: a phone, or a small window or frame. Measured, not the viewport. */
function useCompact(root: HTMLElement | null) {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);
  return { compact: width !== null && width < CENTER_MIN + PANEL.min, width };
}

type SessionScreenProps = {
  sessionId: string | null;
  /** The session as the page loaded it, so it paints before the stream connects. */
  initial?: Session;
  /** Handle ⌘. and ⌘R. Off where the page around owns them (the docs demo). */
  shortcuts?: boolean;
};

export function SessionScreen({ sessionId, initial, shortcuts = true }: SessionScreenProps) {
  const { session, link } = useSession(sessionId, initial);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const { compact: phone, width: screenWidth } = useCompact(root);
  const [pane, setPane] = useState<Pane>("chat");
  const [panel, savePanel] = useStored<PanelState>("workspace-panel", { open: true, width: PANEL.initial }, parsePanel);
  // The width while a drag is under way; saved when it ends.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [tab, setTab] = useState("changes");
  const startDev = useRef<() => void>(() => {});
  const jumpRef = useRef<(turnId: string) => void>(() => {});

  // A different session starts on the conversation and its changes.
  const [lastId, setLastId] = useState(sessionId);
  if (lastId !== sessionId) {
    setLastId(sessionId);
    setPane("chat");
    setReview(null);
    setTab("changes");
  }

  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key === ".") {
        e.preventDefault();
        savePanel({ ...panel, open: !panel.open });
      } else if (e.key.toLowerCase() === "r" && session) {
        // ⌘R starts the dev server here, as in a desktop editor, instead of reloading the page.
        e.preventDefault();
        startDev.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, panel, savePanel, session]);

  function openFile(path: string) {
    setReview(path);
    setTab("review");
    if (!panel.open) savePanel({ ...panel, open: true });
    if (phone) setPane("changes");
  }

  /* ---------- Resizing the panel ---------- */

  const drag = useRef<{ x: number; width: number } | null>(null);
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, width: panel.width };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    setDragWidth(clampWidth(drag.current.width + (e.clientX - drag.current.x) * (rtl ? 1 : -1)));
  }
  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    if (dragWidth !== null) savePanel({ ...panel, width: dragWidth });
    setDragWidth(null);
  }
  function onSplitterKey(e: KeyboardEvent<HTMLDivElement>) {
    const by = { ArrowLeft: PANEL.step, ArrowRight: -PANEL.step, Home: PANEL.max, End: -PANEL.max }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    savePanel({ ...panel, width: clampWidth(panel.width + by) });
  }

  const hasPanes = Boolean(session);
  // The pane never squeezes the conversation under its minimum.
  const room = screenWidth === null ? PANEL.max : Math.max(PANEL.min, screenWidth - CENTER_MIN);
  const width = Math.min(dragWidth ?? panel.width, room);
  const style = { "--panel-width": `${width}px` } as CSSProperties;

  return (
    <div
      ref={setRoot}
      className={styles.screen}
      data-panel={hasPanes && panel.open ? "open" : undefined}
      data-pane={phone && hasPanes ? pane : undefined}
      data-compact={phone || undefined}
      style={style}
    >
      <section className={styles.center} aria-label="Conversation">
        <SessionTopBar
          session={session}
          panelOpen={panel.open}
          onPanelChange={(open) => savePanel({ ...panel, open })}
          onJump={(turnId) => jumpRef.current(turnId)}
          phone={phone}
        />
        {session && <h1 className={text.srOnly}>{session.title}</h1>}
        {sessionId === null ? (
          <NewSession />
        ) : session ? (
          <>
            <SessionThread session={session} link={link} onOpenFile={openFile} jumpRef={jumpRef} />
            <SessionComposer session={session} />
          </>
        ) : link === "missing" ? (
          <SessionMissing />
        ) : (
          <div className={styles.fallback} aria-busy="true">
            <p className={`${styles.loadingLine} ${text.sweep}`}>Loading session…</p>
          </div>
        )}
      </section>

      {session && (
        <>
          <div
            className={styles.splitter}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the changes panel"
            aria-valuemin={PANEL.min}
            aria-valuemax={PANEL.max}
            aria-valuenow={width}
            tabIndex={panel.open ? 0 : -1}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onSplitterKey}
            onDoubleClick={() => savePanel({ ...panel, width: PANEL.initial })}
          />
          <aside className={styles.side} aria-label="Changes" inert={!phone && !panel.open}>
            <ChangesPanel session={session} tab={tab} onTabChange={setTab} review={review} onReview={openFile} />
            {!phone && <RunPanel session={session} startRef={startDev} />}
          </aside>
          {phone && (
            <section className={styles.runPane} aria-label="Run">
              <RunPanel session={session} startRef={startDev} docked />
            </section>
          )}
          {phone && (
            <div className={styles.paneBar}>
              <NavRail
                aria-label="Panes"
                orientation="horizontal"
                value={pane}
                onValueChange={(id) => setPane(id as Pane)}
                items={[
                  { id: "chat", label: "Conversation", icon: <Icon name="compose" /> },
                  { id: "changes", label: "Changes", icon: <Icon name="branch" /> },
                  { id: "run", label: "Run", icon: <Icon name="terminal" /> },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
