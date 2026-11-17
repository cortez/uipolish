"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { AboutStep, AgentStep, DoneStep, FirstTaskStep, ToolsStep, type TaskState } from "./steps";
import type {
  OnboardingChoice,
  OnboardingConnectResult,
  OnboardingFirstTask,
  OnboardingPermission,
  OnboardingStep,
  OnboardingTone,
  OnboardingTool,
  OnboardingValues,
  OnboardingView,
} from "./types";
import styles from "./onboarding.module.css";

export type * from "./types";

type OnboardingProps = {
  /** Your product, in the copy: "Open Acme". */
  productName: string;
  /** The agent, as the person will know it: "Copper". */
  agentName: string;
  /** Logo or wordmark, top left. */
  brand?: ReactNode;
  /** The agent's mark, drawn at 18px on its tile. Without one, its first letter. */
  agentMark?: ReactNode;
  /** Team size choices, as a segmented control. */
  teamSizes?: OnboardingChoice[];
  /** What the person uses the product for, as cards. One is required. */
  useCases: OnboardingChoice[];
  tools: OnboardingTool[];
  tones: OnboardingTone[];
  /** What the agent may do without asking, as switches. */
  permissions: OnboardingPermission[];
  /** What the agent makes on the last step. */
  firstTask: OnboardingFirstTask;
  /** Open on a given step, to resume where the person left off. Pair with `initialValues`. */
  initialStep?: OnboardingView;
  /** What the person already answered, from your last `onChange`. */
  initialValues?: Partial<OnboardingValues>;
  /** Every change, with the step it's on: save it, so a reload resumes here. */
  onChange?: (values: OnboardingValues, step: OnboardingView) => void;
  /** Runs on Continue (and Skip) before the next step shows. Resolve with a message to stay on the step and show it. */
  onSaveStep?: (step: OnboardingStep, values: OnboardingValues) => Promise<string | void>;
  /** Open the provider's sign-in and resolve once it's done. */
  onConnect: (toolId: string) => Promise<OnboardingConnectResult>;
  onDisconnect?: (toolId: string) => void;
  /** Stream the agent's first piece of work with `write`. Reject to show it failed (the error's message is shown). */
  onFirstTask: (run: { values: OnboardingValues; write: (chunk: string) => void; signal: AbortSignal }) => Promise<void>;
  /** The last button. `skipped` when the person pressed "Skip setup". */
  onComplete: (values: OnboardingValues, how: "finished" | "skipped") => void;
  /** How long a connection waits before the row says it's slow. Default 8000ms. */
  slowAfter?: number;
  /** Fill the viewport's height on the canvas color. */
  fullPage?: boolean;
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

const STEPS: OnboardingStep[] = ["about", "tools", "agent", "first-task"];

const DEFAULT_SIZES: OnboardingChoice[] = [
  { value: "solo", label: "Just me" },
  { value: "small", label: "2–5" },
  { value: "medium", label: "6–20" },
  { value: "large", label: "21+" },
];

/** A first-run setup flow for an AI product: about you, tools, the agent's defaults, then its first real piece of work. */
export function Onboarding({
  productName,
  agentName,
  brand,
  agentMark,
  teamSizes = DEFAULT_SIZES,
  useCases,
  tools,
  tones,
  permissions,
  firstTask,
  initialStep = "about",
  initialValues,
  onChange,
  onSaveStep,
  onConnect,
  onDisconnect,
  onFirstTask,
  onComplete,
  slowAfter = 8000,
  fullPage = false,
  headingLevel = 1,
  className,
}: OnboardingProps) {
  const [values, setValues] = useState<OnboardingValues>(() => ({
    name: "",
    teamSize: teamSizes[0]?.value ?? "",
    useCase: "",
    tone: tones[0]?.value ?? "",
    draft: "",
    ...initialValues,
    connected: { ...initialValues?.connected },
    permissions: {
      ...Object.fromEntries(permissions.map((p) => [p.id, Boolean(p.defaultOn)])),
      ...initialValues?.permissions,
    },
  }));
  const [view, setView] = useState<OnboardingView>(initialStep);
  const [skipped, setSkipped] = useState(false);
  // The step "Skip setup" was pressed on: the track keeps what was done before it.
  const [skippedAt, setSkippedAt] = useState(0);
  // Which way the last move went, so the new step comes in from that side. Unset on mount: nothing animates.
  const [dir, setDir] = useState<"forward" | "back" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [task, setTask] = useState<TaskState>(() => ({ status: initialValues?.draft ? "done" : "idle" }));

  const stepRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const valuesRef = useRef(values);
  useLayoutEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const stepIndex = view === "done" ? STEPS.length : STEPS.indexOf(view);
  const doneDraft = task.status === "done" && values.draft !== "";

  // Saved with the step it's on, so a reload can resume there.
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onChangeRef.current?.(values, view);
  }, [values, view]);

  function update(patch: Partial<OnboardingValues>) {
    setValues((v) => ({ ...v, ...patch }));
  }

  // A new step takes focus at its heading, so a screen reader reads where it is.
  useLayoutEffect(() => {
    if (dir) headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of view moves focus
  }, [view]);

  /** Move to another view. The old one is copied, inert, into a layer that slides it out the other way while the new one comes in. */
  function go(next: OnboardingView) {
    if (next === view) return;
    const to = next === "done" ? STEPS.length : STEPS.indexOf(next);
    const way = to > stepIndex ? "forward" : "back";
    const step = stepRef.current;
    const layer = exitRef.current;
    if (step && layer) {
      const ghost = step.cloneNode(true) as HTMLElement;
      ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      ghost.removeAttribute("data-dir");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      layer.replaceChildren(ghost);
      layer.dataset.dir = way;
      const clear = () => {
        if (ghost.parentNode === layer) layer.replaceChildren();
      };
      ghost.addEventListener("animationend", clear, { once: true });
      window.setTimeout(clear, 400);
    }
    if (view === "first-task" && next !== "first-task") stopTask();
    setSaveError(null);
    setAttempted(false);
    setDir(way);
    setView(next);
  }

  // ---------- The first task ----------

  const taskRef = useRef<AbortController | null>(null);

  function startTask() {
    taskRef.current?.abort();
    const run = new AbortController();
    taskRef.current = run;
    setTask({ status: "running" });
    setValues((v) => ({ ...v, draft: "" }));
    const write = (chunk: string) => {
      if (!run.signal.aborted) setValues((v) => ({ ...v, draft: v.draft + chunk }));
    };
    Promise.resolve()
      // A run stopped before it began (a step left at once) never reaches your code.
      .then(() => (run.signal.aborted ? undefined : onFirstTask({ values: { ...valuesRef.current, draft: "" }, write, signal: run.signal })))
      .then(
        () => {
          if (run.signal.aborted) return;
          taskRef.current = null;
          setTask({ status: "done" });
        },
        (error: unknown) => {
          if (run.signal.aborted) return;
          taskRef.current = null;
          setTask({ status: "failed", error: error instanceof Error ? error.message : undefined });
        },
      );
  }

  /** Abandon a run in flight: its half-written draft goes with it. */
  function stopTask() {
    if (!taskRef.current) return;
    taskRef.current.abort();
    taskRef.current = null;
    setTask({ status: "idle" });
    setValues((v) => ({ ...v, draft: "" }));
  }

  useEffect(() => () => taskRef.current?.abort(), []);

  // ---------- Footer ----------

  const aboutErrors = {
    name: values.name.trim() ? null : "Name your workspace. You can change it later.",
    useCase: values.useCase ? null : `Pick what you host, so ${agentName} knows what to write.`,
  };

  async function advance(skip = false) {
    if (saving || view === "done") return;
    if (view === "about" && (aboutErrors.name || aboutErrors.useCase)) {
      setAttempted(true);
      const first = stepRef.current?.querySelector<HTMLElement>(aboutErrors.name ? "input" : '[role="radio"]');
      first?.focus();
      return;
    }
    if (view === "first-task" && skip) stopTask();
    const step = view;
    const next: OnboardingView = STEPS[STEPS.indexOf(step) + 1] ?? "done";
    if (onSaveStep) {
      setSaving(true);
      setSaveError(null);
      let message: string | void;
      try {
        message = await onSaveStep(step, valuesRef.current);
      } catch {
        message = "Couldn’t save your answers. Check your connection and try again.";
      }
      setSaving(false);
      if (message) {
        setSaveError(message);
        return;
      }
    }
    setSkipped(false);
    go(next);
  }

  function skipAll() {
    stopTask();
    setSkippedAt(stepIndex);
    setSkipped(true);
    go("done");
  }

  const H = `h${headingLevel}` as "h1";
  const optional = view === "tools" || (view === "first-task" && !doneDraft);
  const showSkip = optional && !(view === "tools" && Object.keys(values.connected).length > 0);
  const continueLabel = view === "first-task" ? "Finish" : view === "done" ? `Open ${productName}` : "Continue";

  return (
    <section
      className={className ? `${styles.root} ${className}` : styles.root}
      data-full-page={fullPage || undefined}
      aria-label={`Set up ${productName}`}
    >
      <div className={styles.panel} data-view={view}>
        <div className={styles.top}>
          <div className={styles.brand}>{brand}</div>
          {view !== "done" && (
            <Button variant="ghost" className={styles.skipAll} onClick={skipAll}>
              Skip setup
            </Button>
          )}
        </div>

        <Steps
          current={view === "done" && skipped ? skippedAt : stepIndex}
          finished={view === "done" && !skipped}
          skipped={view === "done" && skipped}
          labels={["About you", "Tools", agentName, "First task"]}
          onGo={(i) => !saving && go(STEPS[i])}
        />

        <AnimatedSize className={styles.viewport}>
          <div className={styles.stage}>
            <div ref={exitRef} className={styles.exit} aria-hidden="true" />
            <div key={view} ref={stepRef} className={styles.step} data-dir={dir ?? undefined}>
              {view === "about" && (
                <AboutStep
                  H={H}
                  headingRef={headingRef}
                  agentName={agentName}
                  values={values}
                  update={update}
                  teamSizes={teamSizes}
                  useCases={useCases}
                  errors={attempted ? aboutErrors : { name: null, useCase: null }}
                />
              )}
              {view === "tools" && (
                <ToolsStep
                  H={H}
                  headingRef={headingRef}
                  agentName={agentName}
                  agentMark={agentMark}
                  productName={productName}
                  tools={tools}
                  connected={values.connected}
                  slowAfter={slowAfter}
                  onConnect={onConnect}
                  onConnected={(id, account) => setValues((v) => ({ ...v, connected: { ...v.connected, [id]: account } }))}
                  onDisconnect={(id) => {
                    setValues((v) => {
                      const connected = { ...v.connected };
                      delete connected[id];
                      return { ...v, connected };
                    });
                    onDisconnect?.(id);
                  }}
                />
              )}
              {view === "agent" && (
                <AgentStep
                  H={H}
                  headingRef={headingRef}
                  agentName={agentName}
                  tones={tones}
                  permissions={permissions}
                  tools={tools}
                  values={values}
                  update={update}
                  onConnectTools={() => go("tools")}
                />
              )}
              {view === "first-task" && (
                <FirstTaskStep
                  H={H}
                  headingRef={headingRef}
                  agentName={agentName}
                  agentMark={agentMark}
                  firstTask={firstTask}
                  draft={values.draft}
                  task={task}
                  onStart={startTask}
                  onStop={stopTask}
                />
              )}
              {view === "done" && (
                <DoneStep
                  H={H}
                  headingRef={headingRef}
                  agentName={agentName}
                  productName={productName}
                  skipped={skipped}
                  values={values}
                  teamSizes={teamSizes}
                  useCases={useCases}
                  tools={tools}
                  tones={tones}
                  permissions={permissions}
                />
              )}
              {saveError && (
                <p className={styles.saveError} role="alert">
                  <Icon name="alert" className={styles.saveErrorIcon} />
                  <span>{saveError}</span>
                </p>
              )}
            </div>
          </div>
        </AnimatedSize>

        <div className={styles.footer}>
          {view === "done" ? (
            skipped && (
              <Button variant="secondary" onClick={() => go(STEPS[skippedAt] ?? "about")}>
                Back to setup
              </Button>
            )
          ) : (
            stepIndex > 0 && (
              <Button variant="secondary" onClick={() => !saving && go(STEPS[stepIndex - 1])}>
                Back
              </Button>
            )
          )}
          <div className={styles.footerEnd}>
            {showSkip && (
              <Button variant="ghost" onClick={() => !saving && advance(true)}>
                Skip
              </Button>
            )}
            <Button
              variant="primary"
              busy={saving}
              busyLabel="Saving…"
              onClick={() => (view === "done" ? onComplete(values, skipped ? "skipped" : "finished") : advance())}
            >
              {continueLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The step track: one segment per step that fills as you pass it, the current one in the accent. Steps behind you are buttons back. */
function Steps({
  current,
  finished,
  skipped,
  labels,
  onGo,
}: {
  current: number;
  finished: boolean;
  skipped: boolean;
  labels: string[];
  onGo: (index: number) => void;
}) {
  return (
    <ol className={styles.steps} aria-label="Setup steps" data-finished={finished || undefined}>
      {labels.map((label, i) => {
        const state = i < current ? "done" : i === current && !skipped ? "current" : "todo";
        const inner = (
          <>
            <span className={styles.segment} style={{ "--i": i } as CSSProperties} />
            <span className={styles.stepLabel}>
              <span className={styles.srOnly}>
                {`Step ${i + 1} of ${labels.length}${state === "done" ? ", done" : state === "current" ? ", current" : ""}: `}
              </span>
              {label}
            </span>
          </>
        );
        return (
          <li key={i} className={styles.stepItem} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            {state === "done" ? (
              <button type="button" className={styles.stepButton} onClick={() => onGo(i)}>
                {inner}
              </button>
            ) : (
              <span className={styles.stepButton}>{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
