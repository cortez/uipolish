"use client";

import { UsageBreakdown } from "@registry/usage-meter/usage-meter";
import { useCycle } from "./use-cycle";

/** The conversation grows a reply at a time, then is compacted; the bars ease and the figures roll.
 *  The breakdown, not the bare ring: in a card this size the ring alone is a dot. */
const CONVERSATION = [93_600, 109_800, 124_400, 141_200, 158_900, 21_400];

export default function Showcase() {
  const conversation = CONVERSATION[useCycle(CONVERSATION.length, 1800)];
  const segments = [
    { id: "system", label: "System & tools", value: 12_400 },
    { id: "files", label: "Menus and guest list", value: 18_200 },
    { id: "conversation", label: "Conversation", value: conversation },
  ];
  return (
    <UsageBreakdown
      used={segments.reduce((sum, s) => sum + s.value, 0)}
      limit={200_000}
      agent="Copper"
      segments={segments}
      announce={false}
    />
  );
}
