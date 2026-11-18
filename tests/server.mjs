import { spawn } from "node:child_process";

// The integration tests run against a real server: BASE_URL if it's set,
// otherwise `next start` on the production build (run `npm run build` first).

export async function startServer({ env = {} } = {}) {
  if (process.env.BASE_URL && !Object.keys(env).length) return { url: process.env.BASE_URL.replace(/\/+$/, ""), stop: async () => {} };
  const port = 3900 + Math.floor(Math.random() * 90);
  const child = spawn("npx", ["next", "start", "-p", String(port)], { stdio: "ignore", detached: true, env: { ...process.env, ...env } });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${url}/robots.txt`);
      return { url, stop: async () => process.kill(-child.pid) };
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  process.kill(-child.pid);
  throw new Error("next start didn't come up. Run `npm run build` first.");
}
