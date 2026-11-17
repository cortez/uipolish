"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { Icon } from "@/components/ui/icons/icons";
import { Kbd } from "@/components/ui/kbd/kbd";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs/tabs";
import type { Session } from "@/lib/coding/session";
import styles from "./changes.module.css";

/* The panel under the changes: Run starts the branch's dev server and
   shows its output; Terminal lists the commands the agent ran. Folds to
   its header. In the template, Start dev plays a sample log: point
   startDevServer() at your sandbox's process API (a container, a VM, a
   preview deploy) and stream its lines into `lines`. */

type Line = { at: number; text: string; tone?: "muted" | "success" };

/** Stand-in for your sandbox: a dev server's first lines, as they'd arrive. */
function startDevServer(session: Session, onLine: (line: Line) => void, signal: AbortSignal) {
  const script: [number, Line["text"], Line["tone"]?][] = [
    [0, `$ git checkout ${session.branch}`, "muted"],
    [220, "$ pnpm dev", "muted"],
    [700, "  ▲ Next.js 16.2 (Turbopack)"],
    [160, "  - Local: http://localhost:3000"],
    [900, "  ✓ Ready in 1.4s", "success"],
  ];
  let t = 0;
  for (const [wait, text, tone] of script) {
    t += wait;
    const timer = setTimeout(() => onLine({ at: Date.now(), text, tone }), t);
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  }
}

type RunPanelProps = {
  session: Session;
  /** Filled with Start dev, for ⌘R. */
  startRef: React.RefObject<() => void>;
  /** On a phone the panel is a pane of its own and doesn't fold. */
  docked?: boolean;
};

export function RunPanel({ session, startRef, docked = false }: RunPanelProps) {
  const [open, setOpen] = useState(docked);
  const [tab, setTab] = useState("run");
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  const commands = session.turns.flatMap((turn) =>
    turn.items.flatMap((item) => (item.kind === "steps" ? item.steps.filter((s) => s.input && (s.icon === "terminal" || s.icon === "branch")) : [])),
  );

  function start() {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setLines([]);
    setRunning(true);
    setOpen(true);
    setTab("run");
    startDevServer(session, (line) => setLines((l) => [...l, line]), next.signal);
  }

  function stop() {
    controller.current?.abort();
    setRunning(false);
    setLines((l) => [...l, { at: Date.now(), text: "Stopped.", tone: "muted" }]);
  }

  // ⌘R from anywhere in the session.
  useEffect(() => {
    startRef.current = start;
  });

  // A new branch is a new server.
  useEffect(() => {
    return () => controller.current?.abort();
  }, [session.id]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const bodyId = `run-${session.id}`;

  return (
    <section className={styles.run} data-open={open || undefined} data-docked={docked || undefined} aria-label="Run and terminal">
      <Tabs className={styles.runTabs} value={tab} onValueChange={(t) => (setTab(t), setOpen(true))}>
        <div className={styles.runHead}>
          <TabList aria-label="Run and terminal">
            <Tab value="run">Run</Tab>
            <Tab value="terminal">Terminal</Tab>
          </TabList>
          {running && (
            <span className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" />
              localhost:3000
            </span>
          )}
          {!docked && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.fold}
              aria-label={open ? "Hide the run panel" : "Show the run panel"}
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen(!open)}
            >
              <Icon name={open ? "chevron-down" : "chevron-up"} />
            </Button>
          )}
        </div>
        <div id={bodyId} className={styles.runBody} inert={!open}>
          <div className={styles.runClip}>
            <TabPanel value="run" className={styles.runPanel}>
              {lines.length === 0 ? (
                <div className={styles.runEmpty}>
                  <Button variant="secondary" onClick={start}>
                    <Icon name="play" />
                    Start dev
                    <Kbd keys={["mod", "R"]} variant="plain" size="sm" className={styles.kbd} />
                  </Button>
                  <p className={styles.runHint}>Test your changes here.</p>
                </div>
              ) : (
                <div className={styles.console}>
                  <pre ref={logRef} className={styles.log} tabIndex={0} aria-label="Dev server output" aria-live="polite">
                    {lines.map((l, i) => (
                      <span key={i} className={styles.logLine} data-tone={l.tone}>
                        {l.text}
                        {"\n"}
                      </span>
                    ))}
                  </pre>
                  <div className={styles.consoleActions}>
                    {running ? (
                      <Button variant="secondary" onClick={stop}>
                        <Icon name="stop" />
                        Stop
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={start}>
                        <Icon name="retry" />
                        Restart
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabPanel>
            <TabPanel value="terminal" className={styles.runPanel}>
              {commands.length === 0 ? (
                <div className={styles.runEmpty}>
                  <p className={styles.runHint}>Commands the agent runs show up here.</p>
                </div>
              ) : (
                <pre className={styles.log} tabIndex={0} aria-label="Commands the agent ran">
                  {commands.map((c) => (
                    <span key={c.id} className={styles.logLine} data-tone={c.status === "failed" ? "danger" : undefined}>
                      <span className={styles.prompt}>$ </span>
                      {c.input}
                      {"\n"}
                      {c.output && <span className={styles.logDetail}>{c.output + "\n"}</span>}
                    </span>
                  ))}
                </pre>
              )}
            </TabPanel>
          </div>
        </div>
      </Tabs>
    </section>
  );
}
