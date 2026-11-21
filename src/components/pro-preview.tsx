import type { ReactNode } from "react";
import { ButtonLink } from "@registry/button/button-link";
import { Icon } from "@registry/icons/icons";
import Link from "@/components/link";
import { PRO_OPEN, PRO_PRICE, proCheckout } from "@/lib/pro";
import styles from "./pro-preview.module.css";

/** A UI Polish Pro screen's live preview: a bar that says what this is and
 *  how to get it, over the screen filling the rest of the window. */
export function ProPreview({ title, children }: { title: string; children: ReactNode }) {
  const checkout = proCheckout();
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <ButtonLink as={Link} href="/screens" variant="ghost" size="sm" className={styles.back} aria-label="All screens">
          <Icon name="chevron-left" />
          <span className={styles.backLabel}>Screens</span>
        </ButtonLink>
        <p className={styles.what}>
          <span className={styles.name}>{title}</span>
          <span className={styles.note}>Live preview on sample data</span>
        </p>
        <div className={styles.buy}>
          {PRO_OPEN ? (
            <span className={styles.price}>
              {PRO_PRICE} <span className={styles.once}>one-time, whole team</span>
            </span>
          ) : (
            <span className={styles.once}>Part of UI Polish Pro, opening soon</span>
          )}
          {!PRO_OPEN ? (
            <ButtonLink as={Link} href="/screens" variant="secondary" size="sm">
              About Pro
            </ButtonLink>
          ) : checkout ? (
            <ButtonLink href={checkout} size="sm">
              Buy UI Polish Pro
            </ButtonLink>
          ) : (
            <ButtonLink as={Link} href="/screens#buy" size="sm">
              Get UI Polish Pro
            </ButtonLink>
          )}
        </div>
      </header>
      <div className={styles.frame}>{children}</div>
    </div>
  );
}
