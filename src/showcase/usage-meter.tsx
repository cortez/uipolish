"use client";

import { UsageMeter } from "@registry/usage-meter/usage-meter";

export default function Showcase() {
  return (
    <UsageMeter
      used={124_200}
      limit={200_000}
      agent="Copper"
      segments={[
        { id: "system", label: "System & tools", value: 12_400 },
        { id: "files", label: "Menus and guest list", value: 18_200 },
        { id: "conversation", label: "Conversation", value: 93_600 },
      ]}
    />
  );
}
