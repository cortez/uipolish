import { MCP_URL } from "@/lib/setup";
import { DEFINITION, GITHUB_URL, abs } from "@/lib/seo/site";

// About, contact and privacy: written once in Markdown, rendered as pages
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

const ABOUT: InfoPage = {
  path: "/about",
  heading: "About UI Polish",
  title: "About UI Polish",
  description: "What UI Polish is, and how coding agents use it.",
  body: `${DEFINITION} Each component has every state, transition and edge case worked out: what it does while loading, when it's disabled, how it moves, how a screen reader hears it and how it behaves under a finger instead of a mouse. The rules carry the same standard into the UI an agent writes itself: spacing, type, motion, surfaces and focus, each written as a concrete value.

Every component, block, template and rule is free under the MIT license, and the source is on [GitHub](${GITHUB_URL}).

## How it works

A coding agent connects to the MCP server at ${MCP_URL}, asks for a component, and writes its files into the project: the React component, its CSS module and a guide. The code is then the project's own. The interactive components use [Base UI](https://base-ui.com) for focus, keyboard and positioning, installed alongside them. The same content is available over a [REST API](${abs("/openapi.json")}) and in [llms.txt](${abs("/llms.txt")}).

## What it costs

Nothing. All of it is free, with no account or key, for personal, commercial and client work.

## Contact

Questions and bugs go to [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}). See [Contact](${abs("/contact")}) for what to include.`,
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

const PRIVACY: InfoPage = {
  path: "/privacy",
  heading: "Privacy",
  title: "Privacy policy",
  description: "What UI Polish collects, why, who else handles it, and how to have it removed.",
  body: `Last updated November 17, 2026.

UI Polish collects as little as it can. This page says what that is.

## The website

The site sets no cookies and stores nothing in your browser. It's hosted on [Vercel](https://vercel.com), which keeps standard request logs (IP address, user agent, the page requested and when) to run and protect the service.

It counts visits, anonymously: a daily total of page views, a count per page, and the domain of the site a visit came from (such as news.ycombinator.com, never the full address). Nothing about you is in those counts: no IP address, no cookie, no identifier, so no visit can be linked to another or to a person. The totals are kept for about a year.

## The MCP server and API

Requests to ${MCP_URL} and the REST API carry what your agent sends: the tool or endpoint and its arguments, such as a component name. Nothing you send identifies you.

The server counts its use in the same anonymous way: daily totals of connections, the name a coding agent gives itself (such as "cursor"), tool calls, and which components were requested and whether they were served. No IP address or identifier is part of a count.

## Email

When you email ${SUPPORT_EMAIL}, the message and your address are kept so the conversation can continue. They're used for nothing else.

## Who else handles data

Vercel (hosting) and Upstash (where the anonymous counts are kept). Nothing is sold or shared for advertising.

## Your choices

To see or delete what's held about you, or to ask anything about this page, email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}). If this policy changes, the date at the top changes with it.`,
};

export const INFO_PAGES = { about: ABOUT, contact: CONTACT, privacy: PRIVACY } as const;

/** The page as Markdown, title included. */
export const infoMarkdown = (page: InfoPage) => `# ${page.heading}\n\n${page.body}\n`;
