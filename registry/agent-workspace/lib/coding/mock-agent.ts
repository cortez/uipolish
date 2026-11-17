import type { IconName } from "@/components/ui/icons/icons";
import { sleep, type AgentTask, type CodingAgent } from "./agent";
import type { AgentEvent, ChangedFile, CheckRun } from "./session";

/* A scripted coding agent, so the workspace runs with no model and no
   sandbox. It reads, searches, notes what it found, edits files (with diff
   stats and the two versions for Review), runs the tests, commits, opens
   or updates the pull request, waits for its checks and answers. Three
   prompts have their own scripts (the starters on the home screen); any
   other gets a smaller one built from its words. Put `/fail` in a prompt
   to see a check fail. Safe in the browser: the docs preview runs it. */

type Edit = ChangedFile & { kind: NonNullable<ChangedFile["kind"]> };

export type Scenario = {
  match: RegExp;
  title: string;
  area: string;
  read: string[];
  search: string;
  found: string;
  edits: Edit[];
  test: string;
  passed: number;
  /** What the E2E check says when it fails. */
  failure?: string;
  reply: (hash: string, pr: number) => string;
};

/** One step of a script: wait, then send the event (built once the wait is over, so its times are real). */
export type Beat = { wait: number; event: (now: number) => AgentEvent };

const code = (lines: string[]) => lines.join("\n") + "\n";

export const SCENARIOS: Scenario[] = [
  {
    match: /flaky|checkout e2e/i,
    title: "Fix the flaky checkout test",
    area: "the checkout flow and its E2E test",
    read: ["tests/e2e/checkout.spec.ts", "src/checkout/payment-form.tsx", "src/checkout/use-cart-total.ts"],
    search: "waitForTimeout",
    found:
      "Found it. The test clicks **Pay** after a fixed `waitForTimeout(500)`, but the button stays disabled until `useCartTotal` resolves the tax quote, which takes 300 to 900ms. When the quote is slow the click lands on a disabled button and the order never posts.",
    edits: [
      {
        path: "tests/e2e/checkout.spec.ts",
        kind: "modified",
        added: 6,
        removed: 4,
        before: code([
          'test("pays for a cart", async ({ page }) => {',
          "  await page.goto(\"/checkout\");",
          "  await fillCard(page, TEST_CARD);",
          "  await page.waitForTimeout(500);",
          '  await page.getByRole("button", { name: "Pay" }).click();',
          '  await expect(page.getByText("Order placed")).toBeVisible();',
          "});",
        ]),
        after: code([
          'test("pays for a cart", async ({ page }) => {',
          "  await page.goto(\"/checkout\");",
          "  await fillCard(page, TEST_CARD);",
          '  const pay = page.getByRole("button", { name: "Pay" });',
          "  // Pay is enabled once the tax quote is in.",
          "  await expect(pay).toBeEnabled({ timeout: 5_000 });",
          "  await pay.click();",
          '  await expect(page.getByText("Order placed")).toBeVisible();',
          "});",
        ]),
      },
      {
        path: "src/checkout/payment-form.tsx",
        kind: "modified",
        added: 9,
        removed: 3,
        before: code([
          "export function PaymentForm({ cart }: Props) {",
          "  const total = useCartTotal(cart);",
          "  return (",
          "    <form onSubmit={pay}>",
          "      <CardFields />",
          "      <Button type=\"submit\" disabled={!total}>Pay</Button>",
          "    </form>",
          "  );",
          "}",
        ]),
        after: code([
          "export function PaymentForm({ cart }: Props) {",
          "  const total = useCartTotal(cart);",
          '  const ready = total.status === "ready";',
          "  return (",
          "    <form onSubmit={pay} aria-busy={!ready}>",
          "      <CardFields />",
          '      <Button type="submit" disabled={!ready} busy={total.status === "loading"}>',
          "        Pay {ready && formatMoney(total.amount)}",
          "      </Button>",
          "    </form>",
          "  );",
          "}",
        ]),
      },
      {
        path: "src/checkout/use-cart-total.ts",
        kind: "modified",
        added: 14,
        removed: 7,
        before: code([
          "export function useCartTotal(cart: Cart) {",
          "  const [total, setTotal] = useState<number | null>(null);",
          "  useEffect(() => {",
          "    quoteTax(cart).then((tax) => setTotal(cart.subtotal + tax));",
          "  }, [cart]);",
          "  return total;",
          "}",
        ]),
        after: code([
          'type Total = { status: "loading" } | { status: "ready"; amount: number } | { status: "failed" };',
          "",
          "export function useCartTotal(cart: Cart): Total {",
          '  const [total, setTotal] = useState<Total>({ status: "loading" });',
          "  useEffect(() => {",
          "    const controller = new AbortController();",
          '    setTotal({ status: "loading" });',
          "    quoteTax(cart, controller.signal)",
          '      .then((tax) => setTotal({ status: "ready", amount: cart.subtotal + tax }))',
          '      .catch(() => controller.signal.aborted || setTotal({ status: "failed" }));',
          "    return () => controller.abort();",
          "  }, [cart]);",
          "  return total;",
          "}",
        ]),
      },
      { path: "tests/e2e/fixtures/slow-tax.ts", kind: "added", added: 22, removed: 0 },
    ],
    test: "pnpm test:e2e checkout --repeat-each 20",
    passed: 20,
    reply: (hash, pr) =>
      `The test was racing the tax quote. It clicked **Pay** after a fixed 500ms, but the button only enables once \`useCartTotal\` has the quote, which takes up to 900ms on CI.

- \`checkout.spec.ts\` now waits for **Pay** to be enabled instead of sleeping.
- \`useCartTotal\` returns \`loading\`, \`ready\` or \`failed\` and cancels a stale quote when the cart changes, so a slow quote can't overwrite a newer one.
- **Pay** shows its busy state while the quote loads, and the amount once it's in.
- A \`slow-tax\` fixture delays the quote by 1.5s, so the slow path is tested on purpose.

The test passed 20 runs in a row locally. Committed as \`${hash}\` and pushed to #${pr}.`,
  },
  {
    match: /rate.?limit|export/i,
    title: "Rate limit the export API",
    area: "the export route and how other routes limit requests",
    read: ["src/app/api/export/route.ts", "src/lib/redis.ts", "src/app/api/search/route.ts"],
    search: "429",
    found: "The search route already limits with a fixed window in Redis, but inline. I'll pull that into `src/lib/rate-limit.ts` with a sliding window and use it in both routes.",
    edits: [
      {
        path: "src/lib/rate-limit.ts",
        kind: "added",
        added: 41,
        removed: 0,
        before: "",
        after: code([
          "export async function rateLimit(key: string, { limit, windowMs }: Options) {",
          "  const now = Date.now();",
          "  const bucket = `rl:${key}`;",
          "  await redis.zremrangebyscore(bucket, 0, now - windowMs);",
          "  const used = await redis.zcard(bucket);",
          "  if (used >= limit) return { ok: false, retryAfter: await retryAfter(bucket, windowMs) };",
          "  await redis.zadd(bucket, now, crypto.randomUUID());",
          "  await redis.pexpire(bucket, windowMs);",
          "  return { ok: true, remaining: limit - used - 1 };",
          "}",
        ]),
      },
      {
        path: "src/app/api/export/route.ts",
        kind: "modified",
        added: 12,
        removed: 1,
        before: code(["export async function POST(request: Request) {", "  const workspace = await requireWorkspace(request);", "  return startExport(workspace, await request.json());", "}"]),
        after: code([
          "export async function POST(request: Request) {",
          "  const workspace = await requireWorkspace(request);",
          "  const limit = await rateLimit(`export:${workspace.id}`, { limit: 10, windowMs: 60_000 });",
          "  if (!limit.ok) {",
          "    return Response.json(",
          '      { error: { code: "rate-limited", message: "Up to 10 exports a minute. Try again shortly." } },',
          '      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },',
          "    );",
          "  }",
          "  return startExport(workspace, await request.json());",
          "}",
        ]),
      },
      { path: "src/app/api/search/route.ts", kind: "modified", added: 3, removed: 18 },
      { path: "src/lib/rate-limit.test.ts", kind: "added", added: 64, removed: 0 },
      { path: "docs/api/export.md", kind: "modified", added: 11, removed: 0 },
    ],
    test: "pnpm vitest run src/lib/rate-limit.test.ts src/app/api",
    passed: 37,
    failure: "export.spec.ts: the 11th export in a minute got 200, expected 429",
    reply: (hash, pr) =>
      `\`POST /api/export\` now allows 10 requests a minute per workspace and answers the 11th with a **429**, a \`retry-after\` header and a sentence that says when to try again.

- \`src/lib/rate-limit.ts\` is a sliding window in Redis, shared by export and search. Search keeps its limit of 60 a minute.
- The tests cover the window sliding, two workspaces not sharing a limit, and Redis being down (requests go through, with a warning in the log).
- \`docs/api/export.md\` documents the limit and the error.

Committed as \`${hash}\` on #${pr}.`,
  },
  {
    match: /dark|invoice|theme/i,
    title: "Dark mode for invoice PDFs",
    area: "how invoices are rendered and where the theme comes from",
    read: ["src/invoices/pdf/render.tsx", "src/settings/appearance.ts", "src/invoices/pdf/fonts.ts"],
    search: "palette",
    found: "The PDF renderer hard-codes its colors, and the workspace's appearance setting never reaches it. I'll give the renderer a theme and pass the setting through.",
    edits: [
      { path: "src/invoices/pdf/theme.ts", kind: "added", added: 28, removed: 0 },
      { path: "src/invoices/pdf/render.tsx", kind: "modified", added: 19, removed: 15 },
      { path: "src/invoices/send-invoice.ts", kind: "modified", added: 4, removed: 1 },
      { path: "src/invoices/pdf/render.test.tsx", kind: "modified", added: 26, removed: 2 },
    ],
    test: "pnpm vitest run src/invoices",
    passed: 18,
    reply: (hash, pr) =>
      `Invoice PDFs now follow the workspace's appearance: dark workspaces get the dark palette, everyone else the light one.

- \`theme.ts\` holds both palettes; \`render.tsx\` reads colors from it instead of literals.
- \`send-invoice.ts\` passes the workspace's setting through, so a resent invoice matches too.
- Snapshot tests render both themes.

Committed as \`${hash}\` on #${pr}.`,
  },
  {
    match: /test name|slow (tax|quote) path/i,
    title: "Name the slow tax path in the test",
    area: "the checkout spec and the fixture I added",
    read: ["tests/e2e/checkout.spec.ts", "tests/e2e/fixtures/slow-tax.ts"],
    search: "slowTax",
    found: "The slow path runs inside the same test as the fast one, so a failure doesn't say which. I'll split it into its own `test()` with a name that says so.",
    edits: [
      {
        path: "tests/e2e/checkout.spec.ts",
        kind: "modified",
        added: 9,
        removed: 2,
        before: code(['test("pays for a cart", async ({ page }) => {', "  await useSlowTax(page);", "  await payForCart(page);", "});"]),
        after: code([
          'test("pays for a cart", async ({ page }) => {',
          "  await payForCart(page);",
          "});",
          "",
          'test("pays for a cart when the tax quote is slow (1.5s)", async ({ page }) => {',
          "  await useSlowTax(page);",
          "  await payForCart(page);",
          "});",
        ]),
      },
    ],
    test: "pnpm test:e2e checkout",
    passed: 2,
    reply: (hash, pr) =>
      `The slow path is its own test now: **pays for a cart when the tax quote is slow (1.5s)**, so a failure names the case that broke.

- Both tests share \`payForCart()\`, so they can't drift apart.
- The fast test no longer loads the slow fixture.

Pushed \`${hash}\` to #${pr}.`,
  },
  {
    match: /dashboard|slow (query|queries)/i,
    title: "Speed up the usage dashboard queries",
    area: "the dashboard's queries and their plans",
    read: ["src/dashboard/queries.ts", "src/dashboard/usage-chart.tsx"],
    search: "groupBy",
    found: "`dailyUsage` groups every event in the range before it filters by workspace, so a big workspace scans everyone's rows. Filtering first and adding an index on `(workspace_id, created_at)` should fix it.",
    edits: [
      {
        path: "src/dashboard/queries.ts",
        kind: "modified",
        added: 7,
        removed: 5,
        before: code(["export const dailyUsage = (workspaceId: string, range: Range) =>", "  db.select().from(events)", "    .groupBy(day(events.createdAt))", "    .where(and(inRange(events.createdAt, range), eq(events.workspaceId, workspaceId)));"]),
        after: code([
          "export const dailyUsage = (workspaceId: string, range: Range) =>",
          "  db.select({ day: day(events.createdAt), count: count() })",
          "    .from(events)",
          "    // Filter first: the index on (workspace_id, created_at) does the work.",
          "    .where(and(eq(events.workspaceId, workspaceId), inRange(events.createdAt, range)))",
          "    .groupBy(day(events.createdAt));",
        ]),
      },
      { path: "db/migrations/0042_events_workspace_created_idx.sql", kind: "added", added: 3, removed: 0 },
    ],
    test: "pnpm vitest run src/dashboard",
    passed: 12,
    reply: (hash, pr) =>
      `The dashboard's slowest query now filters by workspace before it groups, and an index covers the filter. On the seed's largest workspace it went from **4.1s to 90ms**.

- \`dailyUsage\` selects only the day and the count.
- Migration \`0042\` adds the index concurrently, so it won't lock \`events\`.

Committed as \`${hash}\` on #${pr}.`,
  },
  {
    match: /feature flag/i,
    title: "Clean up stale feature flags",
    area: "the flags file and where each flag is read",
    read: ["src/lib/feature-flags.ts"],
    search: "isEnabled(",
    found: "Three flags have been on for everyone since August: `newCheckout`, `fastSearch` and `pdfV2`. I'll inline their on paths and delete the off ones.",
    edits: [
      { path: "src/lib/feature-flags.ts", kind: "modified", added: 0, removed: 18 },
      { path: "src/checkout/payment-form.tsx", kind: "modified", added: 2, removed: 9 },
      { path: "src/app/api/search/route.ts", kind: "modified", added: 1, removed: 6 },
      { path: "src/invoices/pdf/legacy-render.tsx", kind: "deleted", added: 0, removed: 142 },
    ],
    test: "pnpm vitest run",
    passed: 214,
    reply: (hash, pr) =>
      `Removed three flags that had been on for everyone for over a month: \`newCheckout\`, \`fastSearch\` and \`pdfV2\`.

- Their on paths are now the only paths; \`legacy-render.tsx\` is gone with \`pdfV2\`.
- No flag left in the file is older than three weeks.

Committed as \`${hash}\` on #${pr}.`,
  },
  {
    match: /profile|form api/i,
    title: "Move the profile form to the new form API",
    area: "the profile form and the new form helpers",
    read: ["src/settings/forms/profile-form.tsx"],
    search: "useForm",
    found: "The form validates in its submit handler. The new API takes the same rules as a schema, so the messages can stay word for word.",
    edits: [
      { path: "src/settings/forms/profile-form.tsx", kind: "modified", added: 31, removed: 44 },
      { path: "src/settings/forms/profile-schema.ts", kind: "added", added: 18, removed: 0 },
    ],
    test: "pnpm vitest run src/settings",
    passed: 9,
    reply: (hash, pr) =>
      `The profile form runs on the new form API. Validation moved into \`profile-schema.ts\` with the same messages, so nothing a person sees changes.

Committed as \`${hash}\` on #${pr}.`,
  },
  {
    match: /webhook|retry policy/i,
    title: "Sketch a retry policy for webhooks",
    area: "how webhooks are sent today",
    read: ["src/webhooks/send.ts", "src/lib/queue.ts"],
    search: "fetch(",
    found: "Webhooks are sent once, inline, and a failure is only logged. I'll queue them with exponential backoff and park the ones that keep failing.",
    edits: [
      { path: "src/webhooks/retry-policy.ts", kind: "added", added: 36, removed: 0 },
      { path: "src/webhooks/send.ts", kind: "renamed", from: "src/webhooks/deliver.ts", added: 14, removed: 9 },
    ],
    test: "pnpm vitest run src/webhooks",
    passed: 7,
    reply: (hash, pr) =>
      `Outgoing webhooks now retry up to **8 times over about 6 hours**, with jittered exponential backoff, then land in a dead-letter queue you can replay.

- \`retry-policy.ts\` holds the schedule, so it's one place to tune.
- A 4xx other than 408 and 429 isn't retried: the receiver said no.

Committed as \`${hash}\` on #${pr}.`,
  },
];

/** A smaller script for any other prompt, built from its words. */
export function scenarioFor(prompt: string): Scenario {
  const known = SCENARIOS.find((s) => s.match.test(prompt));
  if (known) return known;
  const words = prompt.toLowerCase().match(/[a-z]{4,}/g) ?? ["change"];
  const slug = words.slice(0, 2).join("-");
  return {
    match: /$^/,
    title: prompt,
    area: `where ${words.slice(0, 3).join(" ")} lives`,
    read: [`src/lib/${slug}.ts`, "src/app/layout.tsx"],
    search: words[0],
    found: `The change belongs in \`src/lib/${slug}.ts\`; one call site needs the new behavior.`,
    edits: [
      { path: `src/lib/${slug}.ts`, kind: "modified", added: 12, removed: 4 },
      { path: `src/lib/${slug}.test.ts`, kind: "added", added: 30, removed: 0 },
    ],
    test: `pnpm vitest run src/lib/${slug}.test.ts`,
    passed: 6,
    reply: (hash, pr) =>
      `This is a scripted answer: no model is connected, so I didn't really change anything. With a model and a sandbox, this is where I'd say what I changed and why.

- I would have edited \`src/lib/${slug}.ts\` and added tests beside it.
- Set \`AI_PROVIDER\` and a key in \`.env.local\` to get real answers.

Committed as \`${hash}\` on #${pr}.`,
  };
}

const CHECKS = ["Typecheck", "Lint", "Unit tests", "E2E (Chromium)", "Preview deploy"];

/** A stable short hash for a string: the commit the script "makes". */
export function shortHash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

/** The words of a text in pieces of two or three, as a model streams them. */
function* chunks(text: string) {
  const parts = text.match(/\S+\s*/g) ?? [];
  for (let i = 0; i < parts.length; ) {
    const n = 2 + (i % 2);
    yield parts.slice(i, i + n).join("");
    i += n;
  }
}

type ScriptInput = Pick<AgentTask, "prompt" | "session"> & {
  /** Change the steps' timings: 1 is real time, the seed uses it to set how long things took. */
  pace?: number;
  /** Make the E2E check fail. A prompt with `/fail` in it does too. */
  fail?: boolean;
};

/** The whole session a prompt produces, as beats. The mock agent waits each beat out; the seed adds them up. */
export function* script({ prompt, session, pace = 1, fail }: ScriptInput): Generator<Beat> {
  const s = scenarioFor(prompt);
  const turn = session.turns.length;
  const hash = shortHash(prompt + turn);
  const pr = session.pr?.number ?? 8300 + (parseInt(hash, 16) % 600);
  const failing = fail ?? /\/fail\b/.test(prompt);
  const ms = (n: number) => Math.round(n * pace);
  let n = 0;
  const id = (p: string) => `${p}-${turn}-${++n}`;

  function* note(text: string): Generator<Beat> {
    const noteId = id("note");
    for (const piece of chunks(text)) yield { wait: ms(40), event: () => ({ type: "note", id: noteId, text: piece }) };
  }

  type Io = { input?: string; output?: string };
  function* step(group: string, icon: IconName, running: string, done: string, detail: string, wait: number, after?: AgentEvent, io: Io = {}): Generator<Beat> {
    const stepId = id("step");
    let started = 0;
    yield {
      wait: ms(120),
      event: (now) => ((started = now), { type: "step", group, step: { id: stepId, icon, title: running, status: "running", input: io.input, startedAt: now } }),
    };
    yield {
      wait: ms(wait),
      event: (now) => ({ type: "step", group, step: { id: stepId, icon, title: done, status: "done", detail, ...io, startedAt: started, finishedAt: now } }),
    };
    if (after) yield { wait: 0, event: () => after };
  }

  if (turn === 1 && s.title !== prompt) yield { wait: 0, event: () => ({ type: "title", title: s.title }) };

  yield* note(`I'll start with ${s.area}.`);
  const look = id("group");
  for (const path of s.read) yield* step(look, "file", `Reading ${path.split("/").pop()}`, `Read ${path.split("/").pop()}`, path, 420);
  yield* step(look, "search", `Searching for “${s.search}”`, `Searched for “${s.search}”`, `${3 + (s.search.length % 5)} matches in ${2 + (s.search.length % 3)} files`, 640);

  yield* note(s.found);
  const work = id("group");
  for (const edit of s.edits) {
    const verb = edit.kind === "added" ? ["Creating", "Created"] : edit.kind === "deleted" ? ["Deleting", "Deleted"] : ["Editing", "Edited"];
    const name = edit.path.split("/").pop();
    yield* step(work, "pencil", `${verb[0]} ${name}`, `${verb[1]} ${name}`, `+${edit.added} −${edit.removed}`, 520, { type: "file", file: edit });
  }

  const ship = id("group");
  const runner = s.test.split(" ").slice(0, 2).join(" ");
  yield* step(ship, "terminal", `Running ${runner}`, `Ran ${runner}`, `${s.passed} passed`, 1800, undefined, {
    input: s.test,
    output: `${s.passed} passed (${s.passed}) in ${(1.2 + (s.passed % 7) * 0.9).toFixed(1)}s`,
  });
  yield* step(ship, "branch", "Committing", `Committed ${hash}`, `${s.edits.length} ${s.edits.length === 1 ? "file" : "files"}`, 380, undefined, {
    input: `git commit -m "${s.title}"`,
    output: `[${session.branch} ${hash}] ${s.title}\n ${s.edits.length} files changed`,
  });
  yield* step(
    ship,
    "branch",
    session.pr ? `Pushing to #${pr}` : "Opening a pull request",
    session.pr ? `Pushed to #${pr}` : `Opened #${pr}`,
    session.branch,
    700,
    { type: "pr", pr: session.pr ?? { number: pr, url: `https://github.com/${session.repo}/pull/${pr}`, base: "main", merged: false } },
    { input: `git push origin ${session.branch}`, output: session.pr ? `${hash} -> ${session.branch}` : `Opened pull request #${pr}` },
  );

  // The pull request's checks, one after another.
  const checks: CheckRun[] = CHECKS.map((name, i) => ({ id: `check-${turn}-${i}`, name, status: "queued" }));
  const send = (): AgentEvent => ({ type: "checks", checks: checks.map((c) => ({ ...c })) });
  yield { wait: ms(200), event: send };
  for (const [i, check] of checks.entries()) {
    yield { wait: ms(150), event: (now) => ((check.status = "running"), (check.startedAt = now), send()) };
    const fails = failing && check.name.startsWith("E2E");
    yield {
      wait: ms(500 + i * 260),
      event: (now) => (
        (check.status = fails ? "failed" : "passed"),
        (check.finishedAt = now),
        (check.detail = fails ? (s.failure ?? "1 test failed. Open the log for the trace.") : undefined),
        send()
      ),
    };
  }

  for (const piece of chunks(s.reply(hash, pr))) yield { wait: ms(30), event: () => ({ type: "text", text: piece }) };
}

export const mockAgent: CodingAgent = {
  name: "mock",
  async *run(task, signal) {
    for (const beat of script(task)) {
      await sleep(beat.wait, signal);
      yield beat.event(Date.now());
    }
  },
};
