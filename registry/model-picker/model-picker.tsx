"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Select } from "@base-ui/react/select";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./model-picker.module.css";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

export type ModelOption = {
  id: string;
  /** Shown on the trigger. */
  name: string;
  description: string;
  /** Shown but can't be picked. */
  disabled?: boolean;
};

type ModelPickerProps = {
  models: ModelOption[];
  value: string;
  onValueChange: (id: string) => void;
  /** Accessible name of the trigger and list. */
  label?: string;
  side?: Side;
  align?: Align;
  disabled?: boolean;
  className?: string;
};

/** Slides one rounded fill under whichever option Base UI marks `data-highlighted`. */
function useHighlightBar(popup: HTMLElement | null) {
  const barRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!popup || !bar) return;
    function place() {
      if (!bar || !popup) return;
      const option = popup.querySelector<HTMLElement>('[role="option"][data-highlighted]');
      if (!option) {
        bar.removeAttribute("data-visible");
        return;
      }
      const jump = !bar.hasAttribute("data-visible");
      if (jump) bar.setAttribute("data-jump", "");
      bar.style.translate = `0 ${option.offsetTop}px`;
      bar.style.height = `${option.offsetHeight}px`;
      bar.setAttribute("data-visible", "");
      if (jump) {
        bar.getBoundingClientRect();
        bar.removeAttribute("data-jump");
      }
    }
    place();
    const observer = new MutationObserver(place);
    observer.observe(popup, { subtree: true, attributes: true, attributeFilter: ["data-highlighted"] });
    return () => observer.disconnect();
  }, [popup]);
  return barRef;
}

export function ModelPicker({
  models,
  value,
  onValueChange,
  label = "Model",
  side = "bottom",
  align = "start",
  disabled = false,
  className,
}: ModelPickerProps) {
  const id = useId();
  const descriptionId = (modelId: string) => `${id}-${modelId}-description`;
  const selected = models.find((m) => m.id === value) ?? models[0];

  const measureRef = useRef<HTMLSpanElement>(null);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const barRef = useHighlightBar(popup);

  // An explicit px width lets the trigger transition between label widths.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.ceil(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [selected?.name]);

  return (
    <Select.Root
      value={selected?.id ?? null}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== value) onValueChange(next);
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        ref={setTrigger}
        className={className ? `${styles.trigger} ${className}` : styles.trigger}
        style={{ width: width ?? undefined }}
        aria-label={`${label}: ${selected?.name ?? "None"}`}
      >
        <span className={styles.content} aria-hidden="true">
          <TextMorph>{selected?.name ?? ""}</TextMorph>
          <Icon className={styles.chevron} name={open ? "chevron-up" : "chevron-down"} />
        </span>
        <span ref={measureRef} className={`${styles.content} ${styles.measure}`} aria-hidden="true">
          <span>{selected?.name}</span>
          <span className={styles.chevron} />
        </span>
      </Select.Trigger>
      <Select.Portal container={trigger?.closest<HTMLElement>("dialog[open], [data-theme]") ?? undefined}>
        <Select.Positioner
          className={styles.positioner}
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          alignItemWithTrigger={false}
        >
          <Select.Popup ref={setPopup} className={styles.surface} aria-label={label}>
            <span ref={barRef} className={styles.highlight} aria-hidden="true" />
            {models.map((model) => {
              const isSelected = model.id === selected?.id;
              return (
                <Select.Item
                  key={model.id}
                  value={model.id}
                  label={model.name}
                  disabled={model.disabled}
                  aria-describedby={descriptionId(model.id)}
                  className={styles.option}
                >
                  <span className={styles.text}>
                    <Select.ItemText className={styles.name}>{model.name}</Select.ItemText>
                    <span id={descriptionId(model.id)} className={styles.description}>
                      {model.description}
                    </span>
                  </span>
                  <DrawnCheck drawn={isSelected} />
                </Select.Item>
              );
            })}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function DrawnCheck({ drawn }: { drawn: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={styles.check}
      data-drawn={drawn || undefined}
    >
      <path d="M3.75 8.25 6.75 11.25 12.25 5" pathLength={1} />
    </svg>
  );
}
