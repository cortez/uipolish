import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "../icons/icons";
import styles from "./empty-state.module.css";

// No "use client": it holds no state, so it renders on the server.

type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  /** A plain icon above the title. Leave it out for text alone. */
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  /** A quieter alternative to `action`. */
  secondaryAction?: ReactNode;
  /** `compact` inside a panel, list or menu; `page` for a whole view. */
  size?: "compact" | "page";
  /** Defaults to h3 (compact) or h2 (page). */
  titleAs?: "h2" | "h3" | "h4" | "p";
};

/** What a list, table or view shows when it has nothing in it yet: what's
 *  missing, why, and the one thing to do about it. No illustration. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = "compact",
  titleAs,
  className,
  ...props
}: EmptyStateProps) {
  const Title = titleAs ?? (size === "page" ? "h2" : "h3");
  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} data-size={size} {...props}>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <div className={styles.text}>
        <Title className={styles.title}>{title}</Title>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className={styles.action}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
