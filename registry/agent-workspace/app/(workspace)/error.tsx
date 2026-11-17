"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import text from "@/components/ui/text/text.module.css";
import styles from "@/components/app/workspace.module.css";

/* A screen that failed to load, inside the shell: the sidebar still works. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className={styles.fallback}>
      <h1 className={text.srOnly}>Something went wrong</h1>
      <EmptyState
        art="unplugged"
        size="page"
        title="This session didn’t load"
        description="Check your connection, then try again. The agent keeps working while you do."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
