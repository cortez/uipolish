"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup } from "@base-ui/react/checkbox-group";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { TextField } from "../text-field/text-field";
import styles from "./agent-question.module.css";

// Same path as the checkbox's mark, so a ticked card reads as a ticked box.
const CHECK = "M4.25 8.25L6.75 10.75L11.75 5.25";

export type AgentQuestionChoice = {
  value: string;
  /** A few words: "Private link". */
  title: string;
  /** One line on what it means: "Only people with the link see who’s coming". */
  description?: ReactNode;
  disabled?: boolean;
};

export type AgentQuestionPick = {
  /** The choice the agent would make. */
  value: string;
  /** Why, in a few words: "keeps the guest list private". */
  reason: string;
};

export type AgentQuestionAnswer = {
  /** The chosen choices' values, in the order they're listed. */
  values: string[];
  /** What the person typed under "Something else…", when they chose it. */
  other?: string;
};

export type AgentQuestionStatus = "waiting" | "answered";

type AgentQuestionProps = {
  /** The question, as the agent asks it. Names the group for screen readers. */
  question: string;
  /** Two to four. */
  choices: AgentQuestionChoice[];
  /** The agent's name, as the person knows it. */
  agent?: string;
  /** Checkboxes instead of radios: the person can choose several. */
  multiple?: boolean;
  /** The agent's own pick, marked on its card with the reason. */
  recommended?: AgentQuestionPick;
  /** Adds "Something else…", which opens a short field for a typed answer. */
  allowOther?: boolean;
  /** Placeholder for that field. */
  otherPlaceholder?: string;
  /** Controlled. Set it as soon as `onAnswer` fires (or its promise resolves). */
  status?: AgentQuestionStatus;
  /** With `answered`: what the line shows. Defaults to what was just sent. */
  answer?: AgentQuestionAnswer;
  /** Return a promise to show Send as busy until it settles; a rejection shows an error. */
  onAnswer: (answer: AgentQuestionAnswer) => void | Promise<unknown>;
  /**
   * Default true: a card that mounts waiting has just been asked, so its space
   * opens, it fades in, and it is announced. Pass false for one that is on the
   * page from the start (a saved conversation, a static page): it renders in
   * place, holds still and takes no focus. A server-rendered card never enters.
   */
  entrance?: boolean;
  /** Default: an entering card focuses the question only when nothing else on the page has focus. */
  autoFocus?: boolean;
  className?: string;
};

/** The settled line's words: the chosen titles, then the typed answer in quotes. */
function answerText(answer: AgentQuestionAnswer, choices: AgentQuestionChoice[]) {
  const parts = answer.values.map((value) => choices.find((c) => c.value === value)?.title ?? value);
  if (answer.other) parts.push(`“${answer.other}”`);
  return parts.join(", ");
}

/** Opens with height, like the panels in tool approval. */
function Panel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  return (
    <div id={id} className={styles.panel} data-open={open} inert={!open}>
      <div className={styles.clip}>{children}</div>
    </div>
  );
}

/** An agent asking the person to decide something, settling into a line once answered. */
export function AgentQuestion({
  question,
  choices,
  agent = "The agent",
  multiple = false,
  recommended,
  allowOther = false,
  otherPlaceholder = "Type your answer",
  status = "waiting",
  answer: answerProp,
  onAnswer,
  entrance = true,
  autoFocus,
  className,
}: AgentQuestionProps) {
  const baseId = useId();
  const eyebrowId = `${baseId}-eyebrow`;
  const questionId = `${baseId}-question`;
  const otherPanelId = `${baseId}-other-panel`;
  const reopenId = `${baseId}-reopen`;
  // Can't clash with a caller's value: useId's output has characters values don't.
  const otherValue = `${baseId}-other`;

  const rootRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const pointerOnOther = useRef(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [otherError, setOtherError] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<AgentQuestionAnswer | null>(null);
  const [reopened, setReopened] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // True only while hydrating a server-rendered page: that card was already there.
  const fromServer = useSyncExternalStore(subscribeNever, clientSnapshot, serverSnapshot);
  // Only a card that arrives waiting animates in; history and first paint don't.
  const [entering] = useState(status === "waiting" && entrance && !fromServer);

  const settled = status === "answered";
  const otherOn = selected.includes(otherValue);
  const shown = answerProp ?? sent;
  const answerLine = shown ? answerText(shown, choices) : "";
  const pick = recommended ? choices.find((c) => c.value === recommended.value) : undefined;

  // Say what happened once, when it happens.
  const [previous, setPrevious] = useState(status);
  if (previous !== status) {
    setPrevious(status);
    if (settled) setAnnouncement(answerLine ? `Answer sent: ${answerLine}.` : "Answer sent.");
  }

  // Announced a beat after mount, so the live region exists before it changes.
  useEffect(() => {
    const active = document.activeElement;
    // Asked for, or a card that just arrived while the person is in nothing
    // else: never from the prompt, and never on a page's first paint.
    if (autoFocus ?? (entering && (!active || active === document.body))) {
      questionRef.current?.focus({ preventScroll: autoFocus === undefined });
    }
    if (!entering) return;
    const id = window.setTimeout(() => setAnnouncement(`${agent} asks: ${question}`), 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The choices are gone once it settles; if focus was in them, it moves to the line.
  const wasSettled = useRef(settled);
  useLayoutEffect(() => {
    if (settled && !wasSettled.current) {
      const active = document.activeElement;
      if (!active || active === document.body || rootRef.current?.contains(active)) lineRef.current?.focus({ preventScroll: true });
    }
    wasSettled.current = settled;
  }, [settled]);

  function choose(next: string[]) {
    if (pending) return;
    // Keep the listed order, whatever order they were ticked in.
    const ordered = [...choices.map((c) => c.value), otherValue].filter((v) => next.includes(v));
    setSelected(ordered);
    setNudge(null);
    if (!ordered.includes(otherValue)) setOtherError(null);
    // A click on "Something else…" means typing next; arrows passing over it don't.
    if (ordered.includes(otherValue) && !selected.includes(otherValue) && pointerOnOther.current) {
      requestAnimationFrame(() => fieldRef.current?.focus());
    }
    pointerOnOther.current = false;
  }

  function send() {
    if (pending) return;
    const text = otherText.trim();
    if (selected.length === 0) {
      setNudge(multiple ? "Choose at least one first." : "Choose one first.");
      return;
    }
    if (otherOn && !text) {
      setOtherError(`Type your answer, or choose one of ${agent}’s.`);
      fieldRef.current?.focus();
      return;
    }
    const answer: AgentQuestionAnswer = {
      values: selected.filter((v) => v !== otherValue),
      ...(otherOn ? { other: text } : {}),
    };
    setFailed(false);
    setSent(answer);
    const result: unknown = onAnswer(answer);
    if (result instanceof Promise) {
      setPending(true);
      result.then(
        () => setPending(false),
        () => {
          setPending(false);
          setFailed(true);
        },
      );
    }
  }

  // Enter sends from a choice or the field. Caught before Base UI sees it, so
  // it never also ticks a box.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-choice]") || target === fieldRef.current) {
      event.preventDefault();
      event.stopPropagation();
      send();
    }
  }

  // Checkboxes each keep their tab stop; arrows also move between them, as in the radio group.
  function onCheckboxArrows(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const boxes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-choice]:not(:disabled)"));
    const i = boxes.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    event.preventDefault();
    boxes[(i + step + boxes.length) % boxes.length]?.focus();
  }

  const all: AgentQuestionChoice[] = allowOther
    ? [...choices, { value: otherValue, title: "Something else…", description: `Tell ${agent} in your own words.` }]
    : choices;

  const cards = all.map((choice) => (
    <ChoiceCard
      key={choice.value}
      choice={choice}
      multiple={multiple}
      checked={selected.includes(choice.value)}
      pick={recommended?.value === choice.value ? recommended.reason : undefined}
      onPointerDown={choice.value === otherValue ? () => (pointerOnOther.current = true) : undefined}
    />
  ));

  const message = failed ? `${agent} didn’t get your answer. Try again.` : nudge;

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      data-enter={entering || undefined}
    >
      <div className={styles.grow}>
        <AnimatedSize>
          {settled ? (
            <div key="line" className={styles.settled} data-enter>
              <button
                ref={lineRef}
                type="button"
                className={styles.line}
                aria-expanded={reopened}
                aria-controls={reopenId}
                onClick={() => setReopened((o) => !o)}
              >
                <Icon className={styles.lineIcon} name="check" />
                <span className={styles.lineText}>
                  <span className={styles.lineLabel}>Answer sent</span>
                  {answerLine && <span className={styles.lineAnswer}>: {answerLine}</span>}
                </span>
                <Icon className={styles.chevron} name="chevron-right" data-turn={reopened ? "open" : ""} />
              </button>
              <Panel id={reopenId} open={reopened}>
                <div className={styles.reopened}>
                  <p className={styles.quote}>
                    {agent} asked: “{question}”
                  </p>
                  {pick && recommended && (
                    <p className={styles.quote}>
                      {agent} recommended {pick.title}: {recommended.reason}
                    </p>
                  )}
                </div>
              </Panel>
            </div>
          ) : (
            <div
              key="card"
              className={styles.card}
              role="group"
              aria-labelledby={`${eyebrowId} ${questionId}`}
              onKeyDownCapture={onKeyDownCapture}
            >
              <div className={styles.heading}>
                <span id={eyebrowId} className={styles.eyebrow}>
                  {agent} asks
                </span>
                <p ref={questionRef} id={questionId} className={styles.question} tabIndex={-1}>
                  {question}
                </p>
              </div>

              <div className={styles.body}>
                {multiple ? (
                  <CheckboxGroup
                    value={selected}
                    onValueChange={(next) => choose(next)}
                    role="group"
                    aria-labelledby={questionId}
                    aria-busy={pending || undefined}
                    className={styles.choices}
                    onKeyDown={onCheckboxArrows}
                  >
                    {cards}
                  </CheckboxGroup>
                ) : (
                  <RadioGroup<string>
                    value={selected[0] ?? ""}
                    onValueChange={(next) => choose([next])}
                    aria-labelledby={questionId}
                    aria-busy={pending || undefined}
                    className={styles.choices}
                  >
                    {cards}
                  </RadioGroup>
                )}

                {allowOther && (
                  <Panel id={otherPanelId} open={otherOn}>
                    <div className={styles.other}>
                      <TextField
                        ref={fieldRef}
                        label="Your answer"
                        hint={`Enter sends it to ${agent}.`}
                        placeholder={otherPlaceholder}
                        maxLength={200}
                        autoComplete="off"
                        value={otherText}
                        error={otherError}
                        onChange={(e) => {
                          setOtherText(e.currentTarget.value);
                          if (otherError && e.currentTarget.value.trim()) setOtherError(null);
                        }}
                      />
                    </div>
                  </Panel>
                )}
              </div>

              <div className={styles.footer}>
                <p className={styles.message} data-failed={failed || undefined} aria-live="polite">
                  {message && (
                    <span key={message} className={styles.messageText}>
                      {failed && <Icon name="alert" />}
                      {message}
                    </span>
                  )}
                </p>
                <Button busy={pending} onClick={send}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </AnimatedSize>
      </div>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}

const subscribeNever = () => () => {};
const clientSnapshot = () => false;
const serverSnapshot = () => true;

function ChoiceCard({
  choice,
  multiple,
  checked,
  pick,
  onPointerDown,
}: {
  choice: AgentQuestionChoice;
  multiple: boolean;
  checked: boolean;
  pick?: string;
  onPointerDown?: () => void;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const describedBy =
    [choice.description ? `${id}-description` : null, pick ? `${id}-pick` : null].filter(Boolean).join(" ") || undefined;

  return (
    <label
      className={styles.choice}
      data-checked={checked || undefined}
      data-disabled={choice.disabled || undefined}
      data-multiple={multiple || undefined}
      onPointerDown={onPointerDown}
    >
      <span className={styles.control}>
        {multiple ? (
          <>
            <Checkbox.Root
              // A native button, so the wrapping label lands on the control itself.
              nativeButton
              render={<button type="button" />}
              value={choice.value}
              disabled={choice.disabled}
              className={styles.box}
              aria-labelledby={titleId}
              aria-describedby={describedBy}
              data-choice=""
            />
            <svg className={styles.mark} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d={CHECK} pathLength={1} />
            </svg>
          </>
        ) : (
          <Radio.Root
            value={choice.value}
            disabled={choice.disabled}
            className={styles.radio}
            aria-labelledby={titleId}
            aria-describedby={describedBy}
            data-choice=""
          />
        )}
      </span>
      <span className={styles.text}>
        <span id={titleId} className={styles.title}>
          {choice.title}
        </span>
        {choice.description && (
          <span id={`${id}-description`} className={styles.description}>
            {choice.description}
          </span>
        )}
        {pick && (
          <span id={`${id}-pick`} className={styles.pick}>
            <span className={styles.pickLabel}>Recommended:</span> {pick}
          </span>
        )}
      </span>
    </label>
  );
}
