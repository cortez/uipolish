"use client";

import { useId, useRef, type ChangeEvent, type ChangeEventHandler, type ReactNode, type Ref } from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { useDelayedBusy } from "../button/use-delayed-busy";
import styles from "./switch.module.css";

type SwitchProps = Omit<BaseSwitch.Root.Props, "className" | "render" | "nativeButton" | "inputRef" | "onChange"> & {
  /** What the switch turns on. */
  label?: ReactNode;
  /** A second line that says what happens, or why the switch is disabled. */
  description?: ReactNode;
  /** `end` puts the switch at the far edge of a full-width row. */
  side?: "start" | "end";
  /** `md` (default) sits beside a 40px button, `sm` beside a 32px one. */
  size?: "sm" | "md";
  /** The change is being saved. Presses are ignored, focus stays, and after 300ms the thumb shows it's working. */
  busy?: boolean;
  className?: string;
  /** Called with the change event of the hidden checkbox, so `event.target.checked` is the new state. */
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** The hidden checkbox that carries the form value. */
  ref?: Ref<HTMLInputElement>;
};

/** Base UI's Switch: role="switch", reads as on or off, and submits through a hidden checkbox. */
export function Switch({
  label,
  description,
  side = "start",
  size = "md",
  busy = false,
  className,
  id,
  disabled,
  readOnly,
  onChange,
  onCheckedChange,
  ref,
  ...props
}: SwitchProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const labelId = `${inputId}-label`;
  const descriptionId = `${inputId}-description`;
  const inputRef = useRef<HTMLInputElement>(null);
  const busyShown = useDelayedBusy(busy && !disabled);

  return (
    <label
      className={className ? `${styles.root} ${className}` : styles.root}
      data-side={side}
      data-size={size}
      data-disabled={disabled || undefined}
      data-busy={(busy && !disabled) || undefined}
      data-busy-shown={busyShown || undefined}
    >
      <span className={styles.control}>
        <BaseSwitch.Root
          id={inputId}
          className={styles.track}
          disabled={disabled}
          // Busy, not disabled: presses are ignored but focus stays where it was.
          readOnly={readOnly || busy}
          aria-busy={busy || undefined}
          inputRef={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          // The name is the label alone; the description is read after it.
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          onCheckedChange={(checked, details) => {
            onCheckedChange?.(checked, details);
            const input = inputRef.current;
            // Base UI toggles through the hidden checkbox, so its change event is the one callers expect.
            if (onChange && input) {
              const event = details.event;
              onChange({
                type: "change",
                nativeEvent: event,
                target: input,
                currentTarget: input,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation(),
              } as unknown as ChangeEvent<HTMLInputElement>);
            }
          }}
          {...props}
        >
          <BaseSwitch.Thumb className={styles.thumb} />
        </BaseSwitch.Root>
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
