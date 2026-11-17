"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { TopBar } from "@/components/app/top-bar";
import styles from "@/components/app/app.module.css";

/* A page that failed to load, inside the shell: the sidebar still works. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className={styles.page}>
      <TopBar title="Something went wrong" />
      <div className={styles.center}>
        <EmptyState
          art="unplugged"
          title="This page didn’t load"
          description="Check your connection, then try again. Your chats are safe."
          action={<Button onClick={reset}>Try again</Button>}
        />
      </div>
    </div>
  );
}
