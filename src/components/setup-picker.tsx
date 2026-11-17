"use client";

import { useState } from "react";
import { Select } from "@registry/select/select";
import { inline } from "@/lib/markdown";
import { CLIENTS, type Client } from "@/lib/setup";
import { ClientMark } from "./client-mark";
import { InstallCommand } from "./install-command";
import styles from "./setup-picker.module.css";

const OPTIONS = Object.entries(CLIENTS).map(([value, client]) => ({
  value,
  label: client.label,
  icon: <ClientMark client={value} label={client.label} />,
}));

/** Pick a client, copy its setup. */
export function SetupPicker() {
  const [tool, setTool] = useState<Client>("claude-code");
  const t = CLIENTS[tool];
  return (
    <div className={styles.picker}>
      {/* The agent is picked inside the command itself, so the pill stays put
          and only the words around it swap. */}
      <div className={styles.body}>
        <p key={`s-${tool}`}>{inline(t.steps)}</p>
        <InstallCommand
          command={t.command()}
          leading={
            <Select
              size="sm"
              aria-label="Your agent"
              options={OPTIONS}
              value={tool}
              onValueChange={(v) => setTool(v as Client)}
            />
          }
        />
        <p key={`a-${tool}`}>{inline(t.after)}</p>
      </div>
    </div>
  );
}
