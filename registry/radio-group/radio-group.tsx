"use client";

import { useId, useState, type FocusEvent, type ReactNode, type Ref } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { FieldMessage } from "../field/field";
import styles from "./radio-group.module.css";

export type RadioOption = {
  value: string;
  label: string;
  description?: ReactNode;
  /** Cards only: a short fact such as a price. */
  meta?: ReactNode;
  disabled?: boolean;
};

type RadioGroupProps = {
  options: RadioOption[];
  /** Shown as the legend. */
  label: string;
  /** `list`: rows with a dot. `cards`: tiles in a grid. */
  variant?: "list" | "cards";
  /** Guidance under the group, replaced by any error. */
  hint?: string;
  /** Return how to fix the choice, or null. Runs when focus leaves the group. */
  validate?: (value: string) => string | null;
  /** An error from outside, such as the server. Wins over `validate`. */
  error?: string | null;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLFieldSetElement>;
};

/** A Base UI radio group in a fieldset, with a message line and validation. */
export function RadioGroup({
  options,
  label,
  variant = "list",
  hint,
  validate,
  error: externalError,
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  name,
  required,
  disabled = false,
  className,
  ref,
}: RadioGroupProps) {
  const baseId = useId();
  const groupName = name ?? baseId;
  const messageId = `${baseId}-message`;
  const legendId = `${baseId}-legend`;

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;

  const [localError, setLocalError] = useState<string | null>(null);
  const error = externalError ?? localError;
  const hasMessage = Boolean(hint || validate || externalError !== undefined);

  function choose(next: string) {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
    if (localError) setLocalError(validate?.(next) ?? null);
  }

  // Validate when focus leaves the group, not when it moves between radios.
  function onBlur(event: FocusEvent<HTMLFieldSetElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (validate) setLocalError(validate(value));
  }

  return (
    <fieldset
      ref={ref}
      className={className ? `${styles.group} ${className}` : styles.group}
      data-variant={variant}
      disabled={disabled}
      aria-describedby={hasMessage && (error || hint) ? messageId : undefined}
      onBlur={onBlur}
    >
      <legend id={legendId} className={styles.legend}>
        {label}
      </legend>
      {/* Base UI's root is role="radiogroup", which carries the invalid and required states. */}
      <BaseRadioGroup<string>
        value={value}
        onValueChange={(next) => choose(next)}
        name={groupName}
        required={required}
        disabled={disabled}
        aria-labelledby={legendId}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={styles.options}
      >
        {options.map((option) => {
          const id = `${baseId}-${option.value}`;
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={styles.option}
              data-checked={checked || undefined}
              data-disabled={option.disabled || disabled || undefined}
            >
              <span className={styles.control}>
                <Radio.Root
                  value={option.value}
                  className={styles.radio}
                  disabled={option.disabled}
                  aria-describedby={option.description ? `${id}-description` : undefined}
                />
              </span>
              <span className={styles.text}>
                <span className={styles.labelLine}>
                  <span className={styles.label}>{option.label}</span>
                  {variant === "cards" && option.meta && <span className={styles.meta}>{option.meta}</span>}
                </span>
                {option.description && (
                  <span id={`${id}-description`} className={styles.description}>
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </BaseRadioGroup>
      {hasMessage && <FieldMessage id={messageId} hint={hint} error={error} />}
    </fieldset>
  );
}
