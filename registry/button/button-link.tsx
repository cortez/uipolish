import type { ComponentProps, ElementType } from "react";
import styles from "./button.module.css";

// No "use client", so it renders on the server and `as` can take a server-side link.
type ButtonLinkProps = ComponentProps<"a"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /** Your router's link component, so navigation stays client-side. Defaults to a plain <a>. */
  as?: ElementType;
};

/** A link that looks like a button, for navigation. Same variants and sizes. */
export function ButtonLink({ variant = "primary", size = "md", as: Link = "a", className, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      data-variant={variant}
      data-size={size}
      className={className ? `${styles.button} ${className}` : styles.button}
      {...props}
    >
      <span className={styles.content}>{children}</span>
    </Link>
  );
}
