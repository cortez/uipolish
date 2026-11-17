"use client";

import { useState } from "react";
import { InlineEdit } from "@registry/inline-edit/inline-edit";

export default function Showcase() {
  const [name, setName] = useState("Autumn supper club");

  return (
    <InlineEdit
      as="h3"
      label="Event name"
      value={name}
      onCommit={setName}
      validate={(v) => (v.trim() ? null : "Give the dinner a name")}
    />
  );
}
