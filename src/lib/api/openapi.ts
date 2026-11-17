import { componentList, ruleTopics } from "@/lib/api/catalog";
import { SUPPORT_EMAIL } from "@/lib/info-pages";
import { SITE_NAME, abs, siteUrl } from "@/lib/seo/site";

// OpenAPI 3.1 for the read-only REST API. Component names and rule topics
// come from the registry, so the enums are always the real ones. Every
// operation has an operationId, a summary and a description, so it maps
// straight onto a function-calling tool.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: object, description: string) => ({ description, content: { "application/json": { schema } } });
const error = (description: string) => jsonBody(ref("ApiError"), description);

export async function openApiDocument() {
  const names = (await componentList()).map((c) => c.name);
  const topics = await ruleTopics();

  return {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} API`,
      version: "1.0.0",
      summary: "React components and design rules for coding agents, as JSON.",
      description: `Read-only access to the ${SITE_NAME} component registry and design rules: the same content the MCP server at ${abs("/mcp")} serves. Nothing needs a key. Every error is JSON with a stable \`code\`, a \`message\` and a \`hint\`.`,
      contact: { name: SITE_NAME, email: SUPPORT_EMAIL, url: abs("/contact") },
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: siteUrl() }],
    externalDocs: { description: "Docs", url: abs("/docs") },
    tags: [
      { name: "components", description: "React components with their code and guides." },
      { name: "rules", description: "Design rules, design tokens and the pre-ship checklist." },
    ],
    paths: {
      "/api/components": {
        get: {
          operationId: "listComponents",
          tags: ["components"],
          summary: "List every component",
          description: "Every component's name, one-line summary, version, and kit (agent, for the components for AI products). Use a name with getComponent.",
          responses: {
            "200": jsonBody({ type: "object", required: ["components"], properties: { components: { type: "array", items: ref("ComponentSummary") } } }, "The components."),
          },
        },
      },
      "/api/components/{name}": {
        get: {
          operationId: "getComponent",
          tags: ["components"],
          summary: "Get one component's code and guide",
          description:
            "The component's files (React and CSS module), the files of the components it depends on, and its guide: when to use it, every state, motion and accessibility. Write each file at its path, after installing the listed packages.",
          parameters: [
            { name: "name", in: "path", required: true, description: "Component name from listComponents.", schema: { type: "string", enum: names } },
            { name: "stack", in: "query", required: false, description: "Target stack. Only react (CSS modules).", schema: { type: "string", enum: ["react"], default: "react" } },
            {
              name: "tailwind",
              in: "query",
              required: false,
              description: "true for a Tailwind CSS v4 project: each CSS module comes inside Tailwind's components layer, so utility classes override it. Set up the bridge once from GET /api/rules/tailwind.",
              schema: { type: "boolean", default: false },
            },
          ],
          responses: {
            "200": jsonBody(ref("ComponentDetail"), "The component."),
            "400": error("Unsupported stack (code unsupported_stack), or tailwind not true or false (code invalid_parameter)."),
            "404": error("No component with that name (code component_not_found). Includes available names."),
          },
        },
      },
      "/api/theme": {
        get: {
          operationId: "getTheme",
          tags: ["rules"],
          summary: "A color theme from one hue",
          description: "The --ui-* accent, the text on it and in it, optionally tinted grays and accent primary buttons, light and dark, with every text color solved for contrast. Paste the css after tokens.css.",
          parameters: [
            { name: "hue", in: "query", required: false, description: "OKLCH hue, 0–360 (262 blue, the default; 25 red; 150 green).", schema: { type: "number", minimum: 0, maximum: 360 } },
            { name: "tint", in: "query", required: false, description: "Grays: 0 neutral, 1 a hint of the hue (default), 2 tinted.", schema: { type: "integer", enum: [0, 1, 2] } },
            { name: "brand", in: "query", required: false, description: "Primary buttons in the accent (default true).", schema: { type: "boolean" } },
            { name: "format", in: "query", required: false, description: "css for the stylesheet alone.", schema: { type: "string", enum: ["css"] } },
          ],
          responses: {
            "200": jsonBody({ type: "object", required: ["css", "vars"], properties: { css: { type: "string" }, vars: { type: "object", additionalProperties: { type: "string" } } } }, "The theme."),
            "400": error("hue or tint isn't valid (code invalid_parameter)."),
          },
        },
      },
      "/api/rules": {
        get: {
          operationId: "listRuleTopics",
          tags: ["rules"],
          summary: "List rule topics",
          description: "The design-rule topics, plus tokens (the --ui-* design tokens as CSS), checklist (yes/no checks before calling UI done) and tailwind (setup for Tailwind CSS v4 projects).",
          responses: {
            "200": jsonBody({ type: "object", required: ["topics"], properties: { topics: { type: "array", items: ref("RuleTopic") } } }, "The topics."),
          },
        },
      },
      "/api/rules/{topic}": {
        get: {
          operationId: "getRule",
          tags: ["rules"],
          summary: "Get the rules for one topic",
          description: "Concrete values for one topic, as Markdown (tokens is CSS). Read the topic before writing UI that touches it.",
          parameters: [{ name: "topic", in: "path", required: true, description: "Topic from listRuleTopics.", schema: { type: "string", enum: topics } }],
          responses: {
            "200": jsonBody(ref("Rule"), "The rules."),
            "404": error("No such topic (code topic_not_found). Includes available topics."),
          },
        },
      },
    },
    components: {
      schemas: {
        ComponentSummary: {
          type: "object",
          required: ["name", "title", "summary", "type", "version", "docs_url"],
          properties: {
            name: { type: "string", description: "Identifier for getComponent.", examples: ["button"] },
            title: { type: "string", examples: ["Button"] },
            summary: { type: "string" },
            kit: { type: "string", enum: ["agent"], description: "Set on the agent kit: components for AI products." },
            type: { type: "string", enum: ["component"] },
            version: { type: "string", examples: ["0.1.0"] },
            docs_url: { type: "string", format: "uri" },
          },
        },
        ComponentFile: {
          type: "object",
          required: ["component", "path", "content"],
          properties: {
            component: { type: "string", description: "The component this file belongs to." },
            path: { type: "string", description: "Relative path to write it at, e.g. button/button.tsx." },
            content: { type: "string" },
          },
        },
        ComponentDetail: {
          allOf: [
            ref("ComponentSummary"),
            {
              type: "object",
              required: ["dependencies", "packages", "guide", "files", "install"],
              properties: {
                dependencies: { type: "array", items: { type: "string" }, description: "Components it imports, in the order to write them." },
                packages: { type: "array", items: { type: "string" }, description: "npm packages to install first, as name@range (e.g. @base-ui/react@^1.9.0)." },
                guide: { type: "string", description: "The component's guide, in Markdown." },
                files: { type: "array", items: ref("ComponentFile"), description: "Dependencies' files first, then its own." },
                install: { type: "string", description: "How to add the files to a project." },
              },
            },
          ],
        },
        RuleTopic: {
          type: "object",
          required: ["topic", "url"],
          properties: { topic: { type: "string" }, url: { type: "string", format: "uri" } },
        },
        Rule: {
          type: "object",
          required: ["topic", "format", "content"],
          properties: {
            topic: { type: "string" },
            format: { type: "string", enum: ["markdown", "css"] },
            content: { type: "string" },
          },
        },
        ApiError: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "hint", "docs"],
              properties: {
                code: {
                  type: "string",
                  description: "Stable identifier to branch on.",
                  enum: ["not_found", "method_not_allowed", "component_not_found", "topic_not_found", "unsupported_stack", "invalid_parameter"],
                },
                message: { type: "string", description: "What went wrong." },
                hint: { type: "string", description: "How to fix the request." },
                docs: { type: "string", format: "uri" },
                available: { type: "array", items: { type: "string" }, description: "Valid names or topics, on a not-found error." },
                price_usd: { type: "number" },
              },
            },
          },
        },
      },
    },
  };
}
