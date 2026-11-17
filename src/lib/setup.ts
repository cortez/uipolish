export const MCP_URL = "https://uipolish.com/mcp";

/** One line any coding agent can act on: it adds the server itself, and the
 *  server's own instructions tell it when to read the rules. */
export const AGENT_PROMPT = `Set up UI Polish in this project. It's an MCP server with polished React components and the design rules behind them. No account or key is needed.

1. Add the remote MCP server at ${MCP_URL} (streamable HTTP, name it "uipolish"), using the right method for this tool:
   - Claude Code: claude mcp add --transport http uipolish ${MCP_URL}
   - Codex: codex mcp add uipolish --url ${MCP_URL}
   - Cursor: add { "mcpServers": { "uipolish": { "url": "${MCP_URL}" } } } to .cursor/mcp.json
   - VS Code: code --add-mcp '{"name":"uipolish","type":"http","url":"${MCP_URL}"}'
   - Anything else: add ${MCP_URL} as a remote MCP server in its settings.
2. If the tools don't show up until a restart or reconnect, tell me exactly what to do.
3. Once connected, call list_components and tell me in two lines what's available.
4. From now on, when you build UI here, call get_rules for what you're touching and use get_component instead of writing a component from scratch when one exists.`;

type ClientSetup = {
  label: string;
  /** What to do with the command. Commands, paths and flags are in
   *  backticks, as in the guides. */
  steps: string;
  /** The command or config to paste. */
  command: () => string;
  after: string;
};

/**
 * How to connect each client. The first one is the default everywhere.
 * Nothing needs a key or an account.
 */
const SETUPS = {
  "claude-code": {
    label: "Claude Code",
    steps: "Run this in your project:",
    command: () => `claude mcp add --transport http uipolish ${MCP_URL}`,
    after: "Then run `/mcp` in Claude Code to check that UI Polish is connected.",
  },
  codex: {
    label: "Codex",
    steps: "Run this once:",
    command: () => `codex mcp add uipolish --url ${MCP_URL}`,
    after: "Codex picks up UI Polish the next time it starts.",
  },
  cursor: {
    label: "Cursor",
    steps: "Add this to `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for every project:",
    command: () => `{ "mcpServers": { "uipolish": { "url": "${MCP_URL}" } } }`,
    after: "Cursor shows UI Polish under Settings → MCP.",
  },
  vscode: {
    label: "VS Code",
    steps: "Run this once:",
    command: () => `code --add-mcp '{"name":"uipolish","type":"http","url":"${MCP_URL}"}'`,
    after: "Then start UI Polish from the MCP list in VS Code.",
  },
  antigravity: {
    label: "Antigravity",
    steps: "Add this to `~/.gemini/config/mcp_config.json`, or `.agents/mcp_config.json` in your project:",
    command: () => `{ "mcpServers": { "uipolish": { "serverUrl": "${MCP_URL}" } } }`,
    after: "Antigravity loads it the next time it starts.",
  },
  gemini: {
    label: "Gemini CLI",
    steps: "Run this in your project:",
    command: () => `gemini mcp add --transport http uipolish ${MCP_URL}`,
    after: "Gemini CLI connects the next time it starts.",
  },
  chatgpt: {
    label: "ChatGPT",
    steps: "In ChatGPT settings, add a custom connector (developer mode) with this server URL and no authentication:",
    command: () => MCP_URL,
    after: "Then turn the connector on in a chat.",
  },
  other: {
    label: "Any MCP client",
    steps: "Add a remote MCP server over Streamable HTTP with this URL:",
    command: () => MCP_URL,
    after: "No sign-in. Everything works right away.",
  },
} satisfies Record<string, ClientSetup>;

export type Client = keyof typeof SETUPS;
export const CLIENTS: Record<Client, ClientSetup> = SETUPS;
