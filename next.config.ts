import type { NextConfig } from "next";

/** Docs pages that no longer exist: whole screens, apps and feature-sized pieces. */
const RETIRED = [
  "agent-task", "approvals-inbox", "billing", "chat-app", "knowledge-base", "onboarding", "pricing",
  "run-history", "settings", "sign-in", "team-members", "voice-session",
  "agent-console", "agent-workspace", "ai-chat-app",
  "agent-settings", "authorize", "connections", "plan-approval", "tool-approval", "merge-status",
  "file-changes", "turn-summary", "batch-progress", "background-run", "research-progress", "pipeline",
];

const nextConfig: NextConfig = {
  // The MCP route and the component pages read foundation/ and registry/ from
  // disk at request time; a path in readFile() is invisible to the tracer.
  outputFileTracingIncludes: {
    "/mcp": ["./foundation/**/*", "./registry/**/*"],
    "/api/**": ["./foundation/**/*", "./registry/**/*"],
    "/openapi.json": ["./foundation/**/*", "./registry/**/*"],
    "/md/**": ["./foundation/**/*", "./registry/**/*"],
    "/preview/**": ["./registry/**/*"],
  },
  // Pages answer HTML or Markdown depending on Accept (src/proxy.ts), so
  // caches must key on it.
  async headers() {
    return [{ source: "/((?!_next/|api/|mcp).*)", headers: [{ key: "Vary", value: "Accept" }] }];
  },
  // Components live inside the docs now.
  async redirects() {
    return [
      { source: "/components", destination: "/", permanent: true },
      { source: "/components/:name", destination: "/docs/:name", permanent: true },
      { source: "/docs/installation", destination: "/#get-started", permanent: true },
      // UI Polish is components: the screens, apps and feature-sized pieces
      // that were here are retired, and their pages land on the docs.
      ...RETIRED.map((name) => ({ source: `/docs/${name}`, destination: "/", permanent: true })),
      // Retired pages.
      { source: "/pricing", destination: "/", permanent: true },
      { source: "/thanks", destination: "/", permanent: true },
      { source: "/docs/license", destination: "/", permanent: true },
      { source: "/docs/theme", destination: "/", permanent: true },
      // Get started is a dialog on every page now.
      { source: "/docs", destination: "/#get-started", permanent: true },
      { source: "/docs/rules", destination: "/#get-started", permanent: true },
      { source: "/docs/tailwind", destination: "/#get-started", permanent: true },
      { source: "/docs/shadcn", destination: "/#get-started", permanent: true },
    ];
  },
};

export default nextConfig;
