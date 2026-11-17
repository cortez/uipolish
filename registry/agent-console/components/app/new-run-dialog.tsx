"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button/button";
import { Dialog, DialogActions } from "@/components/ui/dialog/dialog";
import { Select } from "@/components/ui/select/select";
import { TextField } from "@/components/ui/text-field/text-field";
import type { AgentOption } from "@/lib/service";
import { useConsole } from "./console-context";
import styles from "./console.module.css";

/* Start a run by hand: pick the agent, say what to do. The run starts at
   once; anything its permissions say to ask about waits in Approvals. */

type NewRunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: AgentOption[];
  defaultAgentId?: string;
  /** With the new run's id, once it's saved. */
  onStarted: (id: string) => void;
};

export function NewRunDialog({ open, onOpenChange, agents, defaultAgentId, onStarted }: NewRunDialogProps) {
  const { api, refreshStatus } = useConsole();
  const [agentId, setAgentId] = useState(defaultAgentId ?? agents[0]?.id ?? "");
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!task.trim()) {
      setError("Say what the agent should do, in a line.");
      return;
    }
    setBusy(true);
    try {
      const id = await api.startRun({ agentId, task });
      setTask("");
      setError(null);
      onOpenChange(false);
      onStarted(id);
      refreshStatus();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The run didn’t start. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New run"
      description="It starts right away. Anything its permissions say to ask about waits in Approvals."
      dirty={task.trim() !== "" && !busy}
      locked={busy}
      footer={
        <DialogActions>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-run" busy={busy} busyLabel="Starting…">
            Start run
          </Button>
        </DialogActions>
      }
    >
      <form id="new-run" className={styles.form} onSubmit={submit} noValidate>
        <Select label="Agent" options={agents.map((a) => ({ value: a.id, label: a.name }))} value={agentId} onValueChange={setAgentId} />
        <TextField
          label="Task"
          value={task}
          maxLength={400}
          placeholder="Reply to Northwind about a double charge"
          hint="What to do, and for whom."
          error={error}
          onChange={(e) => {
            setTask(e.currentTarget.value);
            if (error) setError(null);
          }}
        />
      </form>
    </Dialog>
  );
}
