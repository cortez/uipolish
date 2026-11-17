"use client";

import { useState } from "react";
import { Select } from "@registry/select/select";

export default function Showcase() {
  const [seating, setSeating] = useState("open");
  return (
    <Select
      label="Seating"
      name="seating"
      options={[
        { value: "assigned", label: "Assigned seats" },
        { value: "open", label: "Open seating", description: "Guests sit wherever they like" },
      ]}
      value={seating}
      onValueChange={setSeating}
    />
  );
}
