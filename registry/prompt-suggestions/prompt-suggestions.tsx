"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode, type TransitionEvent } from "react";
import { Icon, ICON_NAMES, type IconName } from "../icons/icons";
import styles from "./prompt-suggestions.module.css";

export type PromptSuggestion = {
  /** What the card or chip says. */
  title: string;
  /** One line under the title. Starter cards only. */
  detail?: string;
  /** A leading icon: a name from the icon set, or your own 16px node. */
  icon?: IconName | ReactNode;
  /** The text to send, when it's longer than the title. Defaults to `title`. */
  prompt?: string;
};

/** What `onSelect` receives: your suggestion, with `prompt` always set. */
export type SelectedSuggestion = PromptSuggestion & { prompt: string };

type PromptSuggestionsProps = Omit<ComponentProps<"div">, "onSelect" | "children"> & {
  /** Strings or objects. Pass `[]` (keep it mounted) to have them leave. */
  suggestions: (string | PromptSuggestion)[];
  /** Called when one is pressed. Send it, or fill the composer with it. */
  onSelect: (suggestion: SelectedSuggestion) => void;
  /** `start`: cards in an empty chat. `follow-up`: chips under an answer. */
  layout?: "start" | "follow-up";
  /** The group's accessible name. */
  label?: string;
  disabled?: boolean;
};

const token = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;
const ms = (value: string) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function normalize(items: (string | PromptSuggestion)[]): SelectedSuggestion[] {
  return items.map((item) =>
    typeof item === "string" ? { title: item, prompt: item } : { ...item, prompt: item.prompt ?? item.title },
  );
}

const keyOf = (items: SelectedSuggestion[]) => items.map((s) => s.prompt).join("\u0000");

function isIconName(icon: unknown): icon is IconName {
  return typeof icon === "string" && (ICON_NAMES as string[]).includes(icon);
}

/** Starter prompts for an empty chat, or follow-up chips under an answer. */
export function PromptSuggestions({
  suggestions,
  onSelect,
  layout = "start",
  label = "Suggested prompts",
  disabled = false,
  className,
  ...props
}: PromptSuggestionsProps) {
  const items = normalize(suggestions);
  const key = keyOf(items);
  // What's on screen: the last non-empty set, held while it leaves.
  const [shown, setShown] = useState(items);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  if (items.length > 0 && (key !== keyOf(shown) || leaving)) {
    setShown(items);
    setLeaving(false);
  } else if (items.length === 0 && shown.length > 0 && !leaving) {
    setLeaving(true);
  }

  // A fallback for when no transition ends (a hidden tab, transitions off).
  useEffect(() => {
    const el = ref.current;
    if (!leaving || !el) return;
    const wait = ms(token(el, "--ui-dur-instant", "120ms")) + (reduced() ? 0 : ms(token(el, "--ui-dur-base", "200ms")));
    const timer = window.setTimeout(() => setShown([]), wait + 100);
    return () => clearTimeout(timer);
  }, [leaving]);

  function finish(event: TransitionEvent<HTMLDivElement>) {
    if (!leaving || event.target !== event.currentTarget) return;
    // The space closes after the fade; under reduced motion it goes at once.
    if (event.propertyName === "grid-template-rows" || (event.propertyName === "opacity" && reduced())) setShown([]);
  }

  if (shown.length === 0) return null;

  return (
    <div
      {...props}
      ref={ref}
      role="group"
      aria-label={label}
      data-layout={layout}
      data-leaving={leaving || undefined}
      // Gone for keyboards and screen readers the moment they start to leave.
      inert={leaving}
      className={className ? `${styles.root} ${className}` : styles.root}
      onTransitionEnd={finish}
    >
      {/* Keyed by the set, so a new set arrives instead of swapping in place. */}
      <ul key={keyOf(shown)} className={styles.list}>
        {shown.map((s, i) => (
          <li key={s.prompt} className={styles.item}>
            <button
              type="button"
              className={layout === "start" ? styles.card : styles.chip}
              disabled={disabled}
              // The title names the card; the detail describes it, read after a pause.
              aria-describedby={layout === "start" && s.detail ? `${id}-${i}` : undefined}
              onClick={() => onSelect(s)}
            >
              {s.icon !== undefined && s.icon !== null && (
                <span className={styles.icon} aria-hidden="true">
                  {isIconName(s.icon) ? <Icon name={s.icon} /> : s.icon}
                </span>
              )}
              {layout === "start" ? (
                <span className={styles.text}>
                  <span className={styles.title}>{s.title}</span>
                  {s.detail && <span id={`${id}-${i}`} className={styles.detail}>{s.detail}</span>}
                </span>
              ) : (
                <span className={styles.label}>{s.title}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
