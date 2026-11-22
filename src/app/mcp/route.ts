import { NextResponse } from "next/server";
import { SERVER_INSTRUCTIONS, TOOLS, callTool, type CallContext } from "@/lib/mcp/tools";
import { licenseKeyFrom } from "@/lib/license";
import { count, slug } from "@/lib/stats";

export const runtime = "nodejs";

// Minimal MCP server: JSON-RPC 2.0 over one HTTP POST endpoint (Streamable
// HTTP transport). The components and rules need no sign-in and no key. Only
// get_screen (UI Polish Pro) needs a license key, sent as
// Authorization: Bearer <key>; it's checked when that tool is called.

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

const SERVER_INFO = { name: "uipolish", version: "0.1.0" };
const CORS = { "access-control-allow-origin": "*" };

const ok = (id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

async function dispatch(req: JsonRpcRequest, ctx: CallContext): Promise<JsonRpcResponse | null> {
  switch (req.method) {
    case "initialize": {
      // Which coding agent connected, by the name it gives itself.
      const client = (req.params?.clientInfo as { name?: unknown } | undefined)?.name;
      ctx.events?.push("mcp.connect", `mcp.client.${slug(typeof client === "string" ? client : "unknown")}`);
      return ok(req.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case "initialized":
    case "notifications/initialized":
      return null;
    case "ping":
      return ok(req.id, {});
    case "tools/list":
      return ok(req.id, { tools: TOOLS });
    case "tools/call": {
      const name = typeof req.params?.name === "string" ? req.params.name : "";
      const args = (req.params?.arguments as Record<string, unknown>) ?? {};
      try {
        const result = await callTool(name, args, ctx);
        return result ? ok(req.id, result) : err(req.id, METHOD_NOT_FOUND, `Tool not found: ${name}`);
      } catch (e) {
        return err(req.id, INTERNAL_ERROR, (e as Error).message);
      }
    }
    default:
      return err(req.id, METHOD_NOT_FOUND, `Method not found: ${req.method}`);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(err(null, PARSE_ERROR, "Parse error"), { status: 400, headers: CORS });
  }

  const ctx: CallContext = { events: [], licenseKey: licenseKeyFrom(request.headers) };
  const isBatch = Array.isArray(body);
  const requests = (isBatch ? body : [body]) as JsonRpcRequest[];
  const responses: JsonRpcResponse[] = [];
  for (const r of requests) {
    if (!r || r.jsonrpc !== "2.0" || typeof r.method !== "string") {
      responses.push(err(r?.id ?? null, INVALID_REQUEST, "Invalid Request"));
      continue;
    }
    const res = await dispatch(r, ctx);
    if (res) responses.push(res);
  }

  count(...ctx.events!);
  if (!isBatch && responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(isBatch ? responses : responses[0], { headers: CORS });
}

export async function GET() {
  return NextResponse.json(
    {
      message: "UI Polish MCP server. POST JSON-RPC 2.0 requests here.",
      serverInfo: SERVER_INFO,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type, authorization, x-license-key, mcp-protocol-version",
    },
  });
}
