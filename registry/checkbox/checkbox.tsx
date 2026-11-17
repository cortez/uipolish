"use client";

import { useId, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import styles from "./checkbox.module.css";

// Same commands so CSS can morph `d`; keep in sync with the stylesheet.
const CHECK = "M4.25 8.25L6.75 10.75L11.75 5.25";
const DASH = "M4.75 8L6.75 8L11.25 8";

type State = "off" | "on" | "mixed";

type CheckboxProps = Omit<
  BaseCheckbox.Root.Props,
  "className" | "style" | "render" | "nativeButton" | "inputRef" | "onCheckedChange" | "ref"
> & {
  className?: string;
  style?: CSSProperties;
  label?: ReactNode;
  description?: ReactNode;
  /** Shows a dash and reads as "mixed"; clicking calls `onCheckedChange(true)`. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** The hidden form `<input>` Base UI renders beside the box. */
  ref?: Ref<HTMLInputElement>;
};

export function Checkbox({
  label,
  description,
  indeterminate = false,
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  className,
  id,
  disabled,
  ref,
  ...props
}: CheckboxProps) {
  const fallbackId = useId();
  const controlId = id ?? fallbackId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;

  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const checked = controlledChecked ?? uncontrolledChecked;
  const state: State = indeterminate ? "mixed" : checked ? "on" : "off";

  // Keep the last shape while hidden so it un-draws as itself.
  const [shown, setShown] = useState(state);
  const [shape, setShape] = useState<"check" | "dash">(state === "mixed" ? "dash" : "check");
  const [morph, setMorph] = useState(false);
  if (shown !== state) {
    setShown(state);
    setMorph(shown !== "off" && state !== "off");
    if (state !== "off") setShape(state === "mixed" ? "dash" : "check");
  }

  return (
    <label
      className={className ? `${styles.root} ${className}` : styles.root}
      data-state={state}
      data-shape={shape}
      data-morph={morph || undefined}
      data-disabled={disabled || undefined}
    >
      <span className={styles.control}>
        <BaseCheckbox.Root
          // A native button, so the wrapping label and `id` land on the control itself.
          nativeButton
          render={<button type="button" />}
          id={controlId}
          inputRef={ref}
          className={styles.box}
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          onCheckedChange={(next) => {
            if (controlledChecked === undefined) setUncontrolledChecked(next);
            onCheckedChange?.(next);
          }}
          {...props}
        />
        <svg className={styles.mark} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          {/* Fallback for browsers without CSS `d`. */}
          <path d={shape === "dash" ? DASH : CHECK} pathLength={1} />
        </svg>
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && (
            <span id={labelId} className={styles.label}>
              {label}
            </span>
          )}
          {description && (
            <span id={descriptionId} className={styles.description}>
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
