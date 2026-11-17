"use client";

import dynamic from "next/dynamic";

/** The home page's one live demo, rendered in the browser only: the page's
 *  HTML stays light and fast, and the box it fills holds its height, so
 *  nothing moves when it arrives. */
const LivePreview = dynamic(() => import("@/components/live-preview").then((m) => m.LivePreview), { ssr: false });

export function HomeShowcase({ name }: { name: string }) {
  return <LivePreview name={name} />;
}
