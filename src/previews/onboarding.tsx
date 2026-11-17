"use client";

import { useEffect, useRef, useState } from "react";
import {
  Onboarding,
  type OnboardingChoice,
  type OnboardingPermission,
  type OnboardingTone,
  type OnboardingTool,
  type OnboardingValues,
  type OnboardingView,
} from "@registry/onboarding/onboarding";
import { Button } from "@registry/button/button";
import { Select } from "@registry/select/select";
import styles from "./preview.module.css";
import own from "./onboarding.module.css";
import { AcmeBrand } from "@/components/logo";

const EMAIL = "mara@saturdaysupper.com";

const USE_CASES: OnboardingChoice[] = [
  { value: "supper-club", label: "Supper club", description: "Regular dinners for a guest list" },
  { value: "pop-up", label: "Pop-ups", description: "One-off nights at a borrowed venue" },
  { value: "private", label: "Private dining", description: "Cooking for one booking at a time" },
  { value: "classes", label: "Cooking classes", description: "Seats sold per session" },
];

const TOOLS: OnboardingTool[] = [
  {
    id: "calendar",
    name: "Google Calendar",
    brand: "googlecalendar",
    provider: "Google",
    description: "Checks your dates and holds the night",
    scopes: [
      { title: "See your events and free time", access: "read" },
      { title: "Add and move supper events", access: "write" },
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    brand: "gmail",
    provider: "Google",
    description: "Drafts replies to guest emails",
    scopes: [
      { title: "Read emails from guests", access: "read" },
      { title: "Write drafts. It never sends them", access: "write" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    brand: "notion",
    description: "Reads your menus and recipe notes",
    scopes: [{ title: "Read the pages you share with Acme", access: "read" }],
  },
  {
    id: "stripe",
    name: "Stripe",
    brand: "stripe",
    description: "Sees deposits and ticket payments",
    scopes: [
      { title: "See payments and payouts", access: "read" },
      { title: "Refund tickets", access: "write" },
    ],
  },
];

const TONES: OnboardingTone[] = [
  {
    value: "warm",
    label: "Warm",
    sample:
      "Good question! There’s free street parking on Alder Lane after 6, and the Pine St garage is a two-minute walk. See you Saturday!",
  },
  {
    value: "brief",
    label: "Brief",
    sample: "Free street parking on Alder Lane after 6 pm. Pine St garage is 2 minutes away.",
  },
  {
    value: "formal",
    label: "Formal",
    sample:
      "Thank you for asking. Street parking on Alder Lane is free after 6 pm, and the Pine Street garage is a two-minute walk from the door.",
  },
];

const PERMISSIONS: OnboardingPermission[] = [
  {
    id: "reminders",
    title: "Send reminders to confirmed guests",
    description: "The day before, with the address and what to bring.",
    defaultOn: true,
  },
  {
    id: "answers",
    title: "Answer common questions",
    description: "Parking, dietary needs and timings, from what you’ve told it.",
    defaultOn: true,
  },
  {
    id: "holds",
    title: "Hold dates on your calendar",
    description: "Adds a tentative event when a guest proposes a date.",
    defaultOn: true,
    requires: "calendar",
  },
  {
    id: "refunds",
    title: "Refund cancelled tickets",
    description: "Inside your cancellation window, up to $60 a ticket.",
    requires: "stripe",
  },
];

const FIRST_TASK = { title: "Invite for Saturday supper", detail: "Sat, Nov 15 · 7:30 pm · 12 seats" };

function invite(values: OnboardingValues) {
  const host = values.name.trim() || "Saturday Supper Club";
  if (values.tone === "brief")
    return `Subject: Supper, Sat Nov 15, 7:30 pm

Six courses around the last of the autumn squash, natural wines to match. 12 seats.

Reply to claim a seat; we hold it 48 hours for the $45 deposit. Note any allergies.

${host}`;
  if (values.tone === "formal")
    return `Subject: An invitation to supper on Saturday, November 15

Dear friends,

You are warmly invited to a long-table supper on Saturday, November 15, at 7:30 pm: six courses built around the last of the autumn squash, with natural wines to accompany them.

Twelve seats are available. Please reply to reserve yours; we will hold it for 48 hours while you arrange the $45 deposit, and kindly mention any allergies.

With best wishes,
${host}`;
  return `Subject: Supper at ours, Saturday Nov 15

Hi friends,

We’re cooking again! Join us for a long-table supper on Saturday, November 15 at 7:30 pm: six courses around the last of the autumn squash, with natural wines to match.

There are 12 seats. Reply to claim yours and we’ll hold it for 48 hours while you sort the $45 deposit. Tell us about any allergies when you do.

Warmly,
${host}`;
}

const COPPER = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10.5h14v2.5a5.5 5.5 0 0 1-5.5 5.5h-3A5.5 5.5 0 0 1 4 13z" />
    <path d="M18 11.5h2.75" />
    <path d="M9 7.5c0-1 1-1.5 1-2.75M13 7.5c0-1 1-1.5 1-2.75" />
  </svg>
);

const ACME = <AcmeBrand />;

const ANSWERED: Partial<OnboardingValues> = {
  name: "Saturday Supper Club",
  teamSize: "small",
  useCase: "supper-club",
};

type Scenario = {
  value: string;
  label: string;
  step?: OnboardingView;
  values?: Partial<OnboardingValues>;
  /** A button in the block to press once it mounts, to land on a state that takes a press. */
  press?: string;
  failConnect?: string;
  slow?: boolean;
  failSave?: string;
  failDraft?: boolean;
};

const SCENARIOS: Scenario[] = [
  { value: "start", label: "First run" },
  { value: "required", label: "Name and use case required", press: "Continue" },
  {
    value: "resume",
    label: "Resume at tools (reload midway)",
    step: "tools",
    values: { ...ANSWERED, connected: { gmail: EMAIL } },
  },
  { value: "connect-fail", label: "Connect fails (Gmail)", step: "tools", values: ANSWERED, failConnect: "gmail" },
  { value: "slow", label: "Slow connect", step: "tools", values: ANSWERED, slow: true },
  {
    value: "agent",
    label: "Agent defaults, Stripe not connected",
    step: "agent",
    values: { ...ANSWERED, connected: { calendar: EMAIL } },
  },
  {
    value: "save-fail",
    label: "Can’t save a step",
    step: "agent",
    values: { ...ANSWERED, connected: { calendar: EMAIL } },
    failSave: "agent",
  },
  {
    value: "task",
    label: "First task streams",
    step: "first-task",
    values: { ...ANSWERED, connected: { calendar: EMAIL, gmail: EMAIL } },
  },
  {
    value: "task-fail",
    label: "First task fails",
    step: "first-task",
    values: { ...ANSWERED, connected: { calendar: EMAIL } },
    failDraft: true,
  },
  { value: "skip-all", label: "Skip setup", press: "Skip setup" },
  {
    value: "done",
    label: "Done",
    step: "done",
    values: { ...ANSWERED, connected: { calendar: EMAIL, gmail: EMAIL, stripe: "" }, draft: "Drafted" },
  },
];

const STEP_NAME: Record<OnboardingView, string> = {
  about: "About you",
  tools: "Tools",
  agent: "Copper",
  "first-task": "First task",
  done: "Done",
};

export function OnboardingPreview() {
  const [state, setState] = useState("start");
  const [run, setRun] = useState(0);
  const [log, setLog] = useState<string | null>(null);
  const scenario = SCENARIOS.find((s) => s.value === state) ?? SCENARIOS[0];

  // The fake server's memory, reset with each run.
  const failed = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function wait(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
      const t = window.setTimeout(resolve, ms);
      timers.current.push(t);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }

  function restart(next = state) {
    timers.current.forEach(clearTimeout);
    failed.current = new Set();
    setLog(null);
    setState(next);
    setRun((r) => r + 1);
  }

  // Some states need a press once the block is there.
  useEffect(() => {
    if (!scenario.press) return;
    const t = window.setTimeout(() => {
      const button = [...(frame.current?.querySelectorAll("button") ?? [])].find(
        // TextMorph lays the label out twice (one copy reserves its width), so match the start.
        (b) => b.textContent?.trim().startsWith(scenario.press!),
      );
      button?.click();
    }, 500);
    return () => clearTimeout(t);
  }, [run, scenario.press]);

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.controls} data-demo-controls="">
          <Select
            aria-label="State"
            className={own.state}
            value={state}
            onValueChange={restart}
            options={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Button variant="secondary" onClick={() => restart()} data-demo-controls="">
            Start over
          </Button>
        </div>

        <div ref={frame} className={own.frame}>
          <Onboarding
            key={run}
            productName="Acme"
            agentName="Copper"
            brand={ACME}
            agentMark={COPPER}
            useCases={USE_CASES}
            tools={TOOLS}
            tones={TONES}
            permissions={PERMISSIONS}
            firstTask={FIRST_TASK}
            initialStep={scenario.step}
            initialValues={scenario.values}
            headingLevel={3}
            slowAfter={scenario.slow ? 2500 : 8000}
            onChange={(values, step) =>
              setLog(
                `Saved: ${STEP_NAME[step]} · ${values.name || "no name yet"} · ${Object.keys(values.connected).length} connected`,
              )
            }
            onSaveStep={async (step) => {
              await wait(450);
              if (step === scenario.failSave && !failed.current.has(`save-${step}`)) {
                failed.current.add(`save-${step}`);
                await wait(500);
                return "Couldn’t save Copper’s settings: the connection dropped. Your choices are still here; press Continue to try again.";
              }
            }}
            onConnect={async (id) => {
              await wait(scenario.slow ? 6000 : 1600);
              if (id === scenario.failConnect && !failed.current.has(id)) {
                failed.current.add(id);
                return {
                  ok: false,
                  message: "Google said the sign-in window closed before access was granted. Try again, or skip Gmail for now.",
                };
              }
              return { ok: true, account: id === "notion" ? "Saturday Supper workspace" : id === "stripe" ? "acct ••• 4821" : EMAIL };
            }}
            onFirstTask={async ({ values, write, signal }) => {
              await wait(900, signal);
              const words = invite(values).split(/(\s+)/);
              for (let i = 0; i < words.length; i++) {
                if (scenario.failDraft && !failed.current.has("draft") && i > words.length * 0.4) {
                  failed.current.add("draft");
                  throw new Error("Copper lost its connection partway through.");
                }
                write(words[i]);
                if (words[i].trim()) await wait(words[i].endsWith(".") ? 120 : 34, signal);
              }
            }}
            onComplete={(values, how) =>
              setLog(`onComplete(${how}) · ${values.name || "no name"}. A real app opens the dashboard here.`)
            }
          />
        </div>

        <p className={styles.note} aria-live="polite">
          {log ??
            "Gmail fails once under “Connect fails”, a step fails to save once under “Can’t save”, and the draft follows the voice you pick."}
        </p>
      </section>
    </div>
  );
}
