import type { NextConfig } from "next";

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
      { source: "/components", destination: "/docs", permanent: true },
      { source: "/components/:name", destination: "/docs/:name", permanent: true },
      { source: "/docs/installation", destination: "/docs", permanent: true },
      // The Chat app block is part of the Chat app template now.
      { source: "/docs/chat-app", destination: "/docs/ai-chat-app", permanent: true },
      // Retired pages.
      { source: "/pricing", destination: "/docs", permanent: true },
      { source: "/thanks", destination: "/docs", permanent: true },
      { source: "/docs/license", destination: "/docs", permanent: true },
    ];
  },
};

export default nextConfig;
