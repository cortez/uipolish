import { listComponents } from "@/lib/content";
import { DEFINITION } from "@/lib/seo/site";
import { CLIENTS } from "@/lib/setup";

// The questions people ask before using it. The home page, llms.txt and the
// FAQPage JSON-LD all read this list, so the answers can't drift apart.
// Counts come from the registry, so they stay right as components ship.

export type Faq = {
  /** Heading id on the home page, so /#free opens that answer. */
  id: string;
  question: string;
  answer: string;
};

/** "A, B and C" */
const list = (items: string[]) => `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export async function getFaq(): Promise<Faq[]> {
  const components = (await listComponents()).filter((c) => !c.primitive);
  const kit = components.filter((c) => c.kit === "agent").map((c) => c.title.toLowerCase());
  const agents = Object.values(CLIENTS)
    .map((c) => c.label)
    .filter((label) => label !== "Any MCP client");

  return [
    {
      id: "what",
      question: "What is UI Polish?",
      answer: `${DEFINITION} It lives at uipolish.com, and all of it, every component and rule, is free under the MIT license.`,
    },
    {
      id: "free",
      question: "Is it free?",
      answer: `Yes. Components and design rules are free, MIT-licensed, for personal, commercial and client work, with no account or key. The source is at github.com/cortez/uipolish. UI Polish Pro, the finished app screens, is $299 one-time.`,
    },
    {
      id: "agent-kit",
      question: "What’s the agent kit?",
      answer: `The components an AI product needs and other libraries don’t have: ${kit.slice(0, 5).join(", ")} and more. Every one of them is free.`,
    },
    {
      id: "disagree",
      question: "What if I disagree with one of the opinions?",
      answer: `Change it. Every opinion is a token in tokens.css or a line in a component’s CSS module: set --ui-dur-fast to 0ms, round the corners differently, swap the accent color, and every component follows. The code is in your project, so nothing stops you from editing a component itself, and every component takes a className for your own styles.`,
    },
    {
      id: "maintained",
      question: "Is it maintained?",
      answer: `Yes. A component gets fixed when it falls short in a product built with it or when someone reports it, and every change bumps the version list_components reports, so your agent can tell when there’s something newer.`,
    },
    {
      id: "update",
      question: "How do I update a component?",
      answer: `Ask your agent for the newer version and it writes the new files over the old ones, or run the shadcn command again with --overwrite. The code is in your project, so commit first and read the diff: anything you changed by hand shows up there, and you decide what to keep.`,
    },
    {
      id: "contribute",
      question: "Can I ask for a component?",
      answer: `Yes. Write to support@uipolish.com with what you’re building and what’s missing. Components come from real products, so the ones people ask for go first.`,
    },
    {
      id: "accessibility",
      question: "Are the components accessible?",
      answer: `Yes. The interactive ones are built on Base UI, the rest on native elements. Each one works fully from the keyboard, tells screen readers what changed, has targets of at least 24px for a mouse and 40px for touch, and respects reduced motion. Every guide lists its accessibility details.`,
    },
    {
      id: "dark-mode",
      question: "Do they work in dark mode?",
      answer: `Yes. The color tokens carry a light and a dark value, each tuned for its theme, and switch with the page's color scheme or a data-theme attribute, which the theme toggle sets for you. Map them onto your own palette and the components follow it in both.`,
    },
    {
      id: "package",
      question: "Is there a package to install?",
      answer: `One: @base-ui/react. The interactive components (menus, selects, dialogs, tabs, sliders) use Base UI for focus, keyboard, positioning and screen reader support, and your agent or the shadcn CLI installs it with them. Everything you see, from the styles and motion to the states, is in files written into your project, so you own and can change them. Ask for a newer version and the agent writes the new files over the old ones.`,
    },
    {
      id: "agents",
      question: "Which coding agents does it work with?",
      answer: `${list([...agents, "any other agent that supports remote MCP servers"])}. Get started on the home page has the setup for each. An agent without MCP can read the same components and rules from the REST API described at /openapi.json, or ask for any docs page as Markdown by adding .md to its address.`,
    },
    {
      id: "stack",
      question: "What does my project need?",
      answer: `React and CSS modules. The components read --ui-* tokens that you map onto the variables you already have. UI Polish doesn’t bring a theme, so it fits alongside whatever styling and design system you already use. With Tailwind CSS v4, the components come in Tailwind’s components layer, so your utility classes override them.`,
    },
  ];
}
