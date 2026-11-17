"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pipeline, type PipelineLogLine, type PipelineStage } from "@registry/pipeline/pipeline";
import { Button } from "@registry/button/button";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./preview.module.css";
import own from "./pipeline.module.css";

type Variant = "passing" | "failing";

// Stage glyphs on the icon set's 16px grid and stroke.
const glyph = (d: string) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke)" }} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  // A box being packed.
  build: glyph("M8 2.25 13.25 5v6L8 13.75 2.75 11V5L8 2.25ZM2.75 5 8 7.75 13.25 5M8 7.75v6"),
  // A flask.
  test: glyph("M6.25 2.25h3.5M6.75 2.25v4L3.4 12.1A1.1 1.1 0 0 0 4.35 13.75h7.3a1.1 1.1 0 0 0 .95-1.65L9.25 6.25v-4M4.9 9.75h6.2"),
  // An eye.
  preview: glyph("M1.75 8C3.1 5.1 5.4 3.5 8 3.5s4.9 1.6 6.25 4.5C12.9 10.9 10.6 12.5 8 12.5S3.1 10.9 1.75 8ZM6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0"),
  // A globe.
  production: glyph("M14.25 8a6.25 6.25 0 1 1-12.5 0a6.25 6.25 0 1 1 12.5 0ZM1.75 8h12.5M8 1.75c-1.7 1.7-2.5 3.8-2.5 6.25S6.3 12.55 8 14.25M8 1.75c1.7 1.7 2.5 3.8 2.5 6.25s-.8 4.55-2.5 6.25"),
};

type Line = [PipelineLogLine, number];
type Plan = { id: keyof typeof ICONS; label: string; lines: Line[]; fail?: { lines: Line[]; error: string } };

const ok = (text: string): PipelineLogLine => ({ text, tone: "success" });
const bad = (text: string): PipelineLogLine => ({ text, tone: "danger" });

const PLAN: Plan[] = [
  {
    id: "build",
    label: "Build",
    lines: [
      ["$ pnpm install --frozen-lockfile", 250],
      ["Lockfile is up to date, resolution step is skipped", 260],
      ["Packages: +812", 220],
      ["Done in 3.1s", 300],
      ["$ pnpm build", 260],
      ["Creating an optimized production build…", 420],
      [ok("✓ Compiled successfully in 14.2s"), 380],
      ["✓ Checked types", 260],
      ["Collecting page data…", 280],
      ["✓ Generated static pages (48/48)", 300],
      ["Route (app)             Size   First load", 160],
      ["○ /                     4.1 kB   112 kB", 90],
      ["○ /menu                 3.2 kB   109 kB", 90],
      ["ƒ /suppers/[slug]       6.8 kB   118 kB", 90],
      ["ƒ /book/[supper]        9.4 kB   124 kB", 90],
      ["ƒ /api/bookings            0 B      0 B", 90],
      ["ƒ /api/guests              0 B      0 B", 90],
      ["○ Static   ƒ Dynamic", 220],
    ],
  },
  {
    id: "test",
    label: "Test",
    lines: [
      ["$ pnpm vitest run", 260],
      ["✓ src/lib/menu.test.ts (18 tests) 212ms", 280],
      ["✓ src/lib/seating.test.ts (24 tests) 340ms", 300],
      ["✓ src/lib/allergens.test.ts (31 tests) 154ms", 240],
      ["✓ src/app/book/booking-form.test.tsx (12 tests) 611ms", 380],
      ["✓ src/app/api/bookings/route.test.ts (9 tests) 288ms", 320],
      ["✓ src/app/api/guests/route.test.ts (22 tests) 402ms", 280],
      [ok("Test Files  8 passed (8)"), 220],
      [ok("     Tests  142 passed (142)"), 260],
    ],
    fail: {
      lines: [
        ["$ pnpm vitest run", 260],
        ["✓ src/lib/menu.test.ts (18 tests) 212ms", 280],
        ["✓ src/lib/seating.test.ts (24 tests) 340ms", 300],
        ["✓ src/lib/allergens.test.ts (31 tests) 154ms", 240],
        [bad("✗ src/app/api/bookings/route.test.ts (9 tests | 2 failed) 301ms"), 420],
        [bad("  × rejects a booking past the 14-guest limit"), 160],
        ["    expected 409 Conflict, got 201 Created", 160],
        [bad("  × holds a seat for 10 minutes while paying"), 160],
        ["    expected hold to expire at 19:40, got 19:30", 260],
        [bad("Test Files  1 failed | 7 passed (8)"), 220],
        [bad("     Tests  2 failed | 140 passed (142)"), 240],
      ],
      error: "2 tests failed in api/bookings/route.test.ts",
    },
  },
  {
    id: "preview",
    label: "Preview",
    lines: [
      ["$ deploy --prebuilt --env preview", 260],
      ["Uploading 214 files (3.8 MB)", 520],
      ["Building 3 edge functions", 420],
      ["Warming 6 regions", 380],
      ["Assigning preview URL", 300],
      [ok("✓ acme-web-git-main-a3f7c1d.preview.acme.app"), 260],
    ],
  },
  {
    id: "production",
    label: "Production",
    lines: [
      ["$ deploy promote a3f7c1d --env production", 260],
      ["Running smoke checks on 6 routes", 460],
      ["✓ /, /suppers, /book, /api/bookings, /api/guests, /menu: 200", 300],
      ["Migrating 3 records (menus.allergens)", 420],
      ["Shifting traffic 10% → 50% → 100%", 560],
      ["Flushing edge cache", 300],
      [ok("✓ Live on acme.app in 14 regions"), 240],
    ],
  },
];

const fresh = (): PipelineStage[] =>
  PLAN.map((p) => ({ id: p.id, label: p.label, icon: ICONS[p.id], status: "queued", log: [] }));

export function PipelinePreview() {
  const [variant, setVariant] = useState<Variant>("passing");
  const [stages, setStages] = useState<PipelineStage[]>(fresh);
  const [cancelled, setCancelled] = useState(false);
  const timers = useRef<number[]>([]);
  const run = useRef(0);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Plays the plan from stage `from`; a failing run breaks at Test unless it's a retry.
  const play = useCallback((v: Variant, from: number, retry = false) => {
    clear();
    const id = ++run.current;
    setCancelled(false);
    const patch = (sid: string, p: (s: PipelineStage) => Partial<PipelineStage>) =>
      setStages((prev) => prev.map((s) => (s.id === sid ? { ...s, ...p(s) } : s)));
    const after = (ms: number, fn: () => void) =>
      timers.current.push(
        window.setTimeout(() => {
          if (run.current === id) fn();
        }, ms),
      );

    const stage = (i: number) => {
      const plan = PLAN[i];
      if (!plan) return;
      const failing = v === "failing" && plan.fail && !(retry && i === from);
      const lines = failing ? plan.fail!.lines : plan.lines;
      patch(plan.id, () => ({ status: "running", startedAt: Date.now(), finishedAt: undefined, log: [], error: undefined }));
      let t = 120;
      for (const [line, ms] of lines) {
        t += ms;
        after(t, () => patch(plan.id, (s) => ({ log: [...(s.log ?? []), line] })));
      }
      after(t + 280, () => {
        if (failing) {
          patch(plan.id, () => ({ status: "failed", finishedAt: Date.now(), error: plan.fail!.error }));
          return;
        }
        patch(plan.id, () => ({ status: "done", finishedAt: Date.now() }));
        stage(i + 1);
      });
    };

    if (from === 0) setStages(fresh());
    after(from === 0 ? 400 : 0, () => stage(from));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => play(variant, 0), 0);
    return () => {
      window.clearTimeout(t);
      clear();
    };
  }, [variant, play]);

  return (
    <div className={styles.stack}>
      <div className={own.head} data-demo-controls="">
        <SegmentedControl data-demo-controls="" size="sm" value={variant} onValueChange={(v) => setVariant(v as Variant)} aria-label="Run" widths="content">
          <Segment value="passing">Passing</Segment>
          <Segment value="failing">Failing tests</Segment>
        </SegmentedControl>
        <Button variant="secondary" onClick={() => play(variant, 0)} data-demo-controls="">
          Replay
        </Button>
      </div>
      <Pipeline
        className={own.card}
        title="Deploy acme-web"
        meta={[
          { label: "main", code: true },
          { label: "a3f7c1d", code: true },
        ]}
        stages={stages}
        cancelled={cancelled}
        doneLabel="Deployed"
        onCancel={() => {
          clear();
          run.current++;
          setCancelled(true);
          setStages((prev) =>
            prev.map((s) =>
              s.status === "running" ? { ...s, status: "skipped", finishedAt: Date.now() } : s.status === "queued" ? { ...s, status: "skipped" } : s,
            ),
          );
        }}
        onRetry={(sid) => play(variant, PLAN.findIndex((p) => p.id === sid), true)}
      />
      <p className={styles.note}>
        Shipping the Acme web app: build, test, a preview, then production. Click a finished stage to read its output
        while the next one runs; scroll up in the log and it holds still. Failing tests stop the run at Test, and Retry
        picks up from there.
      </p>
    </div>
  );
}
