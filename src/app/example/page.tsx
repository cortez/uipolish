import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SCREENS } from "@pro/index";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Copper, an example app",
  description:
    "Copper is an AI assistant for a small catering business, built only from UI Polish components: a sidebar, a streaming chat with reasoning and tool steps, drawers, a command palette and toasts, on sample data.",
  path: "/example",
});

/** The example app: a UI Polish Pro screen, pulled in at build from the
 *  private repo (scripts/fetch-pro.mjs). It fills the window, so it has none
 *  of the site's chrome. Without the screens, there's no page. */
export default function Page() {
  const Copper = SCREENS.copper;
  if (!Copper) notFound();
  return <Copper />;
}
