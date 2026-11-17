"use client";

import { useEffect } from "react";

type Content = { content: { type: "text"; text: string }[] };
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<Content>;
};
type ModelContext = { registerTool: (tool: Tool) => unknown };

/** The REST API's answer as the tool's text. */
async function call(path: string): Promise<Content> {
  const res = await fetch(path);
  return { content: [{ type: "text", text: await res.text() }] };
}

const TOOLS: Tool[] = [
  {
    name: "list_components",
    description: "Every UI Polish component: name, title and a one-line summary.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => call("/api/components"),
  },
  {
    name: "get_component",
    description:
      "One UI Polish component: its code, CSS, guide and what it depends on, ready to write into a project. Pass tailwind: true for a Tailwind CSS v4 project.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The component's name from list_components, like date-picker." },
        tailwind: { type: "boolean" },
      },
      required: ["name"],
    },
    annotations: { readOnlyHint: true },
    execute: ({ name, tailwind }) =>
      call(`/api/components/${encodeURIComponent(String(name))}${tailwind ? "?tailwind=true" : ""}`),
  },
  {
    name: "get_rules",
    description:
      "A UI Polish design rule, for UI you write yourself: motion, states, typography, spacing, surfaces, foundations, antipatterns, tokens, checklist, tailwind or shadcn.",
    inputSchema: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
    },
    annotations: { readOnlyHint: true },
    execute: ({ topic }) => call(`/api/rules/${encodeURIComponent(String(topic))}`),
  },
];

/**
 * WebMCP: the same tools as the MCP server, offered to the agent built into
 * the browser, so it can find a component and fetch it from the page it's
 * on. Read-only; nothing runs where the browser has no model context.
 */
export function WebMcp() {
  useEffect(() => {
    const scope = (document as { modelContext?: ModelContext }).modelContext ??
      (navigator as { modelContext?: ModelContext }).modelContext;
    if (!scope?.registerTool) return;
    const handles = TOOLS.map((tool) => {
      try {
        return scope.registerTool(tool);
      } catch {
        return null; // Already registered, or the browser refused it.
      }
    });
    return () => {
      for (const h of handles) (h as { unregister?: () => void } | null)?.unregister?.();
    };
  }, []);
  return null;
}
