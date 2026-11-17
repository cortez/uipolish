import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo/site";

// Disallow is a prefix match. A crawler that finds a group naming it ignores
// the `*` group entirely, so the AI group repeats the disallows. OG images
// stay allowed: link-preview bots honor robots.txt.
const DISALLOW = ["/mcp", "/preview"];

// Named to welcome them: an assistant that can't read the docs describes the
// product from someone else's summary.
const AI_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "DuckAssistBot", "Amazonbot",
  "meta-externalagent", "cohere-ai", "CCBot", "YouBot", "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments stay out of every index.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const rule = (userAgent: string | string[]) => ({ userAgent, allow: "/", disallow: DISALLOW });
  return { rules: [rule("*"), rule(AI_AGENTS)], sitemap: abs("/sitemap.xml") };
}
