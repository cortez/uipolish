"use client";

import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { useWorkspace } from "./workspace-context";
import text from "@/components/ui/text/text.module.css";
import styles from "./workspace.module.css";

/* A session that isn't there: deleted, never shared with you, or in another workspace. */
export function SessionMissing() {
  const { go } = useWorkspace();
  return (
    <div className={styles.fallback}>
      <h1 className={text.srOnly}>Session not found</h1>
      <EmptyState
        art="search"
        size="page"
        title="This session isn’t here"
        description="It was deleted, it isn’t shared with you, or it’s in another workspace."
        action={<Button onClick={() => go({ session: null })}>Start a session</Button>}
      />
    </div>
  );
}
