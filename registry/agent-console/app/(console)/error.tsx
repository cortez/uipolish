"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { PageBar } from "@/components/app/page-bar";
import styles from "@/components/app/console.module.css";

/* A screen that failed to load, inside the shell: the sidebar still works. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className={`${styles.page} ${styles.withHeading}`}>
      <PageBar />
      <h1 className={styles.srOnly}>Something went wrong</h1>
      <div className={styles.center}>
        <EmptyState
          art="unplugged"
          size="page"
          title="This screen didn’t load"
          description="Check your connection, then try again. Runs keep going while you do."
          action={<Button onClick={reset}>Try again</Button>}
        />
      </div>
    </div>
  );
}
