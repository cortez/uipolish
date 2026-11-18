"use client";

import { MessageBranches } from "@registry/message-branches/message-branches";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <MessageBranches
        versions={[
          { id: "a", content: <p style={{ margin: 0 }}>Roast the lamb from noon and serve at 8.</p>, note: "Balanced" },
          { id: "b", content: <p style={{ margin: 0 }}>Make the galette the main and the lamb a side.</p>, note: "Regenerated · Deep" },
        ]}
      />
    </div>
  );
}
