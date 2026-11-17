"use client";

import { useState } from "react";
import { ToolSteps, type ToolStep } from "@registry/tool-steps/tool-steps";
import styles from "./showcase.module.css";

const STEPS: ToolStep[] = [
  { id: "read", title: "Read guest-list.csv", status: "done", detail: "12 guests, 3 allergies" },
  { id: "search", title: "Searched 3 grocers", status: "done" },
  {
    id: "order",
    title: "Placing the grocery order",
    status: "failed",
    error: "market.example.com didn’t respond within 10 seconds.",
  },
];

export default function Showcase() {
  const [steps, setSteps] = useState(STEPS);
  const retry = (id: string) =>
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, title: "Placed the grocery order", status: "done" } : s)));
  return (
    <div className={styles.stack}>
      <ToolSteps steps={steps} onRetry={retry} defaultOpen />
    </div>
  );
}
