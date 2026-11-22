import { createHash } from "node:crypto";

// UI Polish Pro license keys, checked against Polar. A buyer's key comes in
// on the MCP request (Authorization: Bearer <key>) and is only checked when
// a Pro tool is called. The key itself is never logged, stored or echoed:
// the cache below is keyed by its hash.

export type LicenseCheck = "valid" | "invalid" | "unavailable";

/** What Polar's answer to POST /v1/license-keys/validate means. */
export function interpretValidation(status: number, body: unknown, now = Date.now()): LicenseCheck {
  if (status === 404 || status === 422 || status === 400) return "invalid";
  if (status < 200 || status >= 300) return "unavailable";
  const key = body as { status?: unknown; expires_at?: unknown } | null;
  if (!key || key.status !== "granted") return "invalid";
  if (typeof key.expires_at === "string" && Date.parse(key.expires_at) <= now) return "invalid";
  return "valid";
}

/** The key from an MCP request: `Authorization: Bearer <key>`, or `x-license-key`. */
export function licenseKeyFrom(headers: Headers): string | undefined {
  const auth = headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const key = auth || headers.get("x-license-key")?.trim();
  return key ? key.slice(0, 200) : undefined;
}

const VALID_FOR = 10 * 60_000;
const INVALID_FOR = 60_000;
const cache = new Map<string, { result: LicenseCheck; until: number }>();

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

export async function checkLicense(key: string | undefined): Promise<LicenseCheck> {
  if (!key) return "invalid";
  const id = hash(key);
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.result;

  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  const organization = process.env.POLAR_ORGANIZATION_ID?.trim();
  if (!token || !organization) return "unavailable";
  const api = process.env.POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

  let result: LicenseCheck;
  try {
    const res = await fetch(`${api}/v1/license-keys/validate`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ key, organization_id: organization }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    result = interpretValidation(res.status, await res.json().catch(() => null));
  } catch {
    result = "unavailable";
  }

  if (result !== "unavailable") {
    if (cache.size >= 1000) cache.clear();
    cache.set(id, { result, until: Date.now() + (result === "valid" ? VALID_FOR : INVALID_FOR) });
  }
  return result;
}
