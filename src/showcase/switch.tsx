"use client";

import { useState } from "react";
import { Switch } from "@registry/switch/switch";

/** The switch and its label, together and centered: the label is its name. */
export default function Showcase() {
  const [lateRsvps, setLateRsvps] = useState(true);
  return <Switch label="Late RSVPs" checked={lateRsvps} onChange={(e) => setLateRsvps(e.target.checked)} />;
}
