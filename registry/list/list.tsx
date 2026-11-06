import { useId, type ComponentProps, type ElementType, type MouseEventHandler, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/icons";
import styles from "./list.module.css";

// No "use client": rows hold no state, so lists render on the server.

type ListProps = ComponentProps<"ul"> & {
  /** `box` (default) has a rounded surface; `plain` has none. */
  variant?: "box" | "plain";
};

/** A list of peer rows. */
export function List({ variant = "box", className, children, ...props }: ListProps) {
  return (
    // Safari drops list semantics from an unbulleted list unless the role is stated.
    <ul role="list" data-variant={variant} className={className ? `${styles.list} ${className}` : styles.list} {...props}>
      {children}
    </ul>
  );
}

type Current = boolean | "page" | "step" | "location" | "date" | "time";

type ListItemProps = Omit<ComponentProps<"li">, "title" | "onClick"> & {
  /** Avatar, icon or thumbnail; decorative. */
  leading?: ReactNode;
  /** Also the accessible name of a link or button row. */
  title: ReactNode;
  description?: ReactNode;
  /** Text here joins the description. */
  trailing?: ReactNode;
  /** Secondary actions (use `ListAction`). */
  actions?: ReactNode;
  chevron?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  /** Your router's link component. Defaults to <a>. */
  as?: ElementType;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Sets `aria-current`: `page` for links, else `true` or the value you pass. */
  current?: Current;
  /** Can't be opened now; say why in `description`. */
  disabled?: boolean;
};

/** One row; `href` or `onClick` makes it one link or button. */
export function ListItem({
  leading,
  title,
  description,
  trailing,
  actions,
  chevron = false,
  href,
  target,
  rel,
  as: LinkAs = "a",
  onClick,
  current,
  disabled = false,
  className,
  ...props
}: ListItemProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const trailingId = `${id}-trailing`;
  const kind = href !== undefined ? "link" : onClick ? "button" : "static";
  const interactive = kind !== "static";

  const trailingIsText = typeof trailing === "string" || typeof trailing === "number";
  const describedBy = [description != null && descriptionId, trailingIsText && trailingId].filter(Boolean).join(" ") || undefined;
  const ariaCurrent = current === true ? (kind === "link" ? "page" : "true") : current || undefined;

  const titleText = <span className={styles.title}>{title}</span>;
  let primary: ReactNode;
  if (kind === "link") {
    // No href leaves the tab order; the role still announces a link.
    primary = disabled ? (
      <a className={styles.primary} role="link" aria-disabled="true" aria-describedby={describedBy}>
        {titleText}
      </a>
    ) : (
      <LinkAs
        className={styles.primary}
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        aria-current={ariaCurrent}
        aria-describedby={describedBy}
      >
        {titleText}
      </LinkAs>
    );
  } else if (kind === "button") {
    primary = (
      <button
        type="button"
        className={styles.primary}
        disabled={disabled}
        onClick={onClick}
        aria-current={ariaCurrent}
        aria-describedby={describedBy}
      >
        {titleText}
      </button>
    );
  } else {
    primary = (
      <span className={styles.primary} aria-current={ariaCurrent}>
        {titleText}
      </span>
    );
  }

  return (
    <li
      className={className ? `${styles.row} ${className}` : styles.row}
      data-interactive={(interactive && !disabled) || undefined}
      data-current={ariaCurrent ? "" : undefined}
      data-disabled={disabled || undefined}
      {...props}
    >
      {leading != null && <span className={styles.leading}>{leading}</span>}
      <span className={styles.main}>
        <span className={styles.text}>
          {primary}
          {description != null && (
            <span id={descriptionId} className={styles.description}>
              {description}
            </span>
          )}
        </span>
        {trailing != null && (
          <span id={trailingId} className={styles.trailing}>
            {trailing}
          </span>
        )}
        {actions != null && <span className={styles.actions}>{actions}</span>}
        {chevron && <Icon name="chevron-right" className={styles.chevron} />}
      </span>
    </li>
  );
}

type ListActionProps = Omit<ComponentProps<"button">, "children"> & {
  icon: IconName;
  /** Says what and which: "Remove Maya Chen", not "Remove". */
  label: string;
};

/** A round icon button for a row's `actions`. */
export function ListAction({ icon, label, className, type = "button", ...props }: ListActionProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={className ? `${styles.action} ${className}` : styles.action}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
