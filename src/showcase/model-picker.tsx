"use client";

import { useState } from "react";
import { ModelPicker } from "@registry/model-picker/model-picker";

const MODELS = [
  { id: "fast", name: "Fast", description: "Quick answers to short questions" },
  { id: "balanced", name: "Balanced", description: "Everyday writing, code and analysis" },
  { id: "deep", name: "Deep", description: "Thinks longer on hard problems" },
];

export default function Showcase() {
  const [model, setModel] = useState("balanced");

  return <ModelPicker models={MODELS} value={model} onValueChange={setModel} />;
}
