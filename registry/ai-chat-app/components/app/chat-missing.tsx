"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { TopBar } from "./top-bar";
import styles from "./app.module.css";

/** /chat/<id> for a chat that was deleted or isn't this person's. */
export function ChatMissing() {
  const router = useRouter();
  return (
    <div className={styles.page}>
      <TopBar title="Chat not found" />
      <div className={styles.center}>
        <EmptyState
          art="search"
          title="This chat isn’t here"
          description="It may have been deleted, or it belongs to another account."
          action={<Button onClick={() => router.push("/chat")}>New chat</Button>}
        />
      </div>
    </div>
  );
}
