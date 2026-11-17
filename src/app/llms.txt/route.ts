import { llmsResponse } from "@/lib/seo/llms";

// Built from files at build time, so it's prerendered and served from the CDN.
export const dynamic = "force-static";

export const GET = () => llmsResponse(false);
