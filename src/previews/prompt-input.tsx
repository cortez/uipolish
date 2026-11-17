"use client";

import { useEffect, useRef, useState } from "react";
import { PromptInput, type PromptMessage } from "@registry/prompt-input/prompt-input";
import { Select } from "@registry/select/select";
import base from "./preview.module.css";

const SUGGESTIONS = [
  "Plan a dinner for 14 guests",
  "Make the shopping list",
  "Two guests are vegetarian",
];

function demoFiles() {
  return [
    new File([new Uint8Array(48_213)], "guest-list-saturday.pdf", { type: "application/pdf" }),
    new File([new Uint8Array(3_412)], "seating.csv", { type: "text/csv" }),
  ];
}

export function ModePicker() {
  return (
    <Select
      size="sm"
      aria-label="Response mode"
      defaultValue="balanced"
      options={[
        { value: "quick", label: "Quick" },
        { value: "balanced", label: "Balanced" },
        { value: "thorough", label: "Thorough" },
      ]}
    />
  );
}

export function PromptInputPreview() {
  const [streaming, setStreaming] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [draftStreaming, setDraftStreaming] = useState(true);
  const [files] = useState(demoFiles);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleSubmit({ text, files }: PromptMessage) {
    const attached = files.length ? ` with ${files.length} ${files.length === 1 ? "file" : "files"}` : "";
    setSent(`Sent “${text || "(no text)"}”${attached}. Replying…`);
    setStreaming(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStreaming(false);
      setSent("Reply finished.");
    }, 5000);
  }

  function handleStop() {
    clearTimeout(timer.current);
    setStreaming(false);
    setSent("Stopped. Your draft is still there.");
  }

  return (
    <div className={base.stack}>
      <section className={`${base.group} ${base.measure}`}>
        <h2 className={base.heading}>Dinner for 14</h2>
        <PromptInput
          placeholder="Ask about the menu, the shopping, the timing…"
          suggestions={SUGGESTIONS}
          streaming={streaming}
          onStop={handleStop}
          onSubmit={handleSubmit}
          accept="image/*,.pdf,.csv,.txt"
          footer={<ModePicker />}
        />
        <p className={base.note} role="status">
          {sent ?? "Pick a suggestion, type, paste an image or drop a file. Try a .zip to see a rejection."}
        </p>
      </section>

      <section className={`${base.group} ${base.measure}`}>
        <h2 className={base.label}>While a reply streams</h2>
        <PromptInput
          defaultValue="Also, my sister is bringing dessert, so drop the cake"
          streaming={draftStreaming}
          onStop={() => setDraftStreaming(false)}
          onSubmit={() => setDraftStreaming(true)}
          footer={<ModePicker />}
        />
      </section>

      <section className={`${base.group} ${base.measure}`}>
        <h2 className={base.label}>With attachments</h2>
        <PromptInput
          defaultValue="Can you check the seating against the guest list?"
          defaultFiles={files}
          onSubmit={() => false}
          hint="Images, PDFs and spreadsheets up to 20 MB"
        />
      </section>

      <section className={`${base.group} ${base.measure}`}>
        <h2 className={base.label}>Disabled</h2>
        <PromptInput placeholder="Reconnecting…" disabled onSubmit={() => {}} hint={false} />
      </section>
    </div>
  );
}
