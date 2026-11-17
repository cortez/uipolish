import { MCP_URL } from "@/lib/setup";
import { GITHUB_URL } from "@/lib/seo/site";

// Contact: written once in Markdown, rendered as pages
// and served as-is to agents that ask for Markdown, so the two never differ.

export const SUPPORT_EMAIL = "support@uipolish.com";

export type InfoPage = {
  path: string;
  /** The page title, also the Markdown's # heading. */
  heading: string;
  title: string;
  description: string;
  /** Body without the # heading. */
  body: string;
};

const CONTACT: InfoPage = {
  path: "/contact",
  heading: "Contact",
  title: "Contact UI Polish",
  description: "How to reach UI Polish for support and bug reports.",
  body: `Email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}) for anything about UI Polish.

## Support and bugs

Say which component you're using, which coding agent and which browser, and what you expected to happen. A screenshot or a short recording of the problem helps most. For a component that renders wrong, the component's version from \`list_components\` tells us which code you have.

## Issues and pull requests

UI Polish is open source at [${GITHUB_URL.replace("https://", "")}](${GITHUB_URL}). A bug you can reproduce is best as an issue there, with the component, the browser and the steps. Pull requests are welcome: a component change keeps its props stable, reads only \`--ui-*\` tokens and updates its guide in the same change.

## Everything else

Partnerships, press and anything not covered above go to the same address.`,
};

export const INFO_PAGES = { contact: CONTACT } as const;

/** The page as Markdown, title included. */
export const infoMarkdown = (page: InfoPage) => `# ${page.heading}\n\n${page.body}\n`;
