import type { ReactNode } from "react";
import styles from "./settings.module.css";

/** A panel's heading and the line under it. */
export function SectionHead({ id, title, intro, action }: { id: string; title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.headText}>
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        {intro && <p className={styles.intro}>{intro}</p>}
      </div>
      {action && <div className={styles.headAction}>{action}</div>}
    </div>
  );
}

/** A group of rows under a small heading. */
export function Group({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.group} aria-labelledby={id}>
      <div className={styles.groupHead}>
        <h3 id={id} className={styles.groupTitle}>
          {title}
        </h3>
        {intro && <p className={styles.description}>{intro}</p>}
      </div>
      {children}
    </section>
  );
}

/** Label and line on the left, the control on the right; stacked when the panel is narrow. */
export function Row({
  label,
  labelId,
  description,
  descriptionId,
  tone,
  align = "center",
  children,
}: {
  label: ReactNode;
  labelId?: string;
  description?: ReactNode;
  descriptionId?: string;
  /** Colors the description: a warning about the value. */
  tone?: "warning" | "danger";
  /** `field` lines the label up with a 40px field's middle. */
  align?: "center" | "field";
  children: ReactNode;
}) {
  return (
    <div className={styles.row} data-align={align}>
      <div className={styles.text}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {description && (
          <p id={descriptionId} className={styles.description} data-tone={tone}>
            {description}
          </p>
        )}
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}
