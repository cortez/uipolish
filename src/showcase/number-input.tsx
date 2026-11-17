"use client";

import { NumberInput } from "@registry/number-input/number-input";

export default function Showcase() {
  return <NumberInput label="Guests" name="guests" defaultValue={6} min={1} max={12} />;
}
