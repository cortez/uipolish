"use client";

import { useState } from "react";
import { Select } from "@registry/select/select";
import { ClientMark } from "./client-mark";
import { InstallCommand } from "./install-command";
import styles from "./setup-picker.module.css";

type Install = { id: string; label: string; note: string; command: string };

/** The design rules' install, picked per agent the same way as the MCP
 *  setup on the introduction: the agent is chosen inside the command. */
export function SkillPicker({ installs }: { installs: readonly Install[] }) {
  const [id, setId] = useState(installs[0].id);
  const current = installs.find((i) => i.id === id) ?? installs[0];
  return (
    <div className={styles.picker}>
      <div className={styles.body}>
        <InstallCommand
          command={current.command}
          label={`Install for ${current.label}`}
          leading={
            <Select
              size="sm"
              aria-label="Your agent"
              options={installs.map((i) => ({ value: i.id, label: i.label, icon: <ClientMark client={i.id} label={i.label} /> }))}
              value={id}
              onValueChange={(v) => setId(v as string)}
            />
          }
        />
        <p key={id}>{current.note}</p>
      </div>
    </div>
  );
}
