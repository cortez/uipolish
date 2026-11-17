"use client";

import { useState } from "react";
import { ModelPicker, type ModelOption } from "@registry/model-picker/model-picker";
import { PromptInput } from "@registry/prompt-input/prompt-input";
import base from "./preview.module.css";
import styles from "./model-picker.module.css";

const MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Quick answers to short questions" },
  { id: "balanced", name: "Balanced", description: "Everyday writing, code and analysis" },
  { id: "deep", name: "Deep", description: "Thinks longer on hard problems" },
  {
    id: "long-context",
    name: "Long context",
    description: "Whole cookbooks and long threads. Household plan only.",
    disabled: true,
  },
];

export function ModelPickerPreview() {
  const [model, setModel] = useState("balanced");
  const [standalone, setStandalone] = useState("fast");
  const [sent, setSent] = useState("");
  const name = MODELS.find((m) => m.id === model)?.name;

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>In the composer</h2>
        <PromptInput
          placeholder="Ask about Saturday’s menu…"
          attachments={false}
          footer={<ModelPicker models={MODELS} value={model} onValueChange={setModel} side="top" />}
          onSubmit={({ text }) => setSent(`Sent “${text}” to ${name}.`)}
        />
        <p className={base.note} role="status">
          {sent || `Replies use ${name}.`}
        </p>
      </section>

      <section className={base.group}>
        <h2 className={base.heading}>On its own</h2>
        <div className={styles.toolbar}>
          <span className={styles.label}>Summaries are written by</span>
          <ModelPicker models={MODELS} value={standalone} onValueChange={setStandalone} label="Summary model" />
        </div>
      </section>
    </div>
  );
}
