import type { NextConfig } from "next";
import { RETIRED_DOCS, RETIRED_PRO_DOCS } from "./src/lib/retired";

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
      // UI Polish Pro lives at /pro; /screens was its first address (and
      // Polar's success URL may still point there, with ?purchased=1).
      { source: "/screens", destination: "/pro", permanent: true },
      { source: "/screens/:name", destination: "/pro/:name", permanent: true },
      { source: "/components/:name", destination: "/docs/:name", permanent: true },
      { source: "/docs/installation", destination: "/#get-started", permanent: true },
      // Earlier Pro offerings (blocks and paid components) and the
      // retired whole screens/apps they lived on. /pricing was the old
      // paid-plan page, which never stated today's price when it
      // redirected home.
      { source: "/pricing", destination: "/pro", permanent: true },
      { source: "/thanks", destination: "/pro", permanent: true },
      ...RETIRED_PRO_DOCS.map((name) => ({ source: `/docs/${name}`, destination: "/pro", permanent: true })),
      // Retired pages that were not the paid product.
      ...RETIRED_DOCS.map((name) => ({ source: `/docs/${name}`, destination: "/", permanent: true })),
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
