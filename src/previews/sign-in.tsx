"use client";

import { useEffect, useRef, useState } from "react";
import {
  SignIn,
  type SignInInitialState,
  type SignInProvider,
  type SignInSuccess,
} from "@registry/sign-in/sign-in";
import { GitHubMark, GoogleMark } from "@registry/sign-in/provider-marks";
import { Button } from "@registry/button/button";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { Select } from "@registry/select/select";
import styles from "./preview.module.css";
import own from "./sign-in.module.css";
import { AcmeBrand } from "@/components/logo";

type Mode = "sign-in" | "sign-up";

const EMAIL = "mara@saturdaysupper.com";

const PROVIDERS: SignInProvider[] = [
  { id: "google", name: "Google", mark: <GoogleMark /> },
  { id: "github", name: "GitHub", mark: <GitHubMark /> },
];

/** Every screen the block can open on. Busy states play out under "Slow network". */
const STATES: { value: string; label: string; start?: SignInInitialState; slow?: boolean }[] = [
  { value: "idle", label: "Email (start)" },
  { value: "slow", label: "Slow network (sending, verifying)", slow: true },
  { value: "sent", label: "Code sent", start: { step: "code", email: EMAIL, resendIn: 24 } },
  {
    value: "wrong",
    label: "Wrong code",
    start: { step: "code", email: EMAIL, resendIn: 0, failure: { ok: false, reason: "wrong-code", attemptsLeft: 2 } },
  },
  { value: "expired", label: "Code expired", start: { step: "code", email: EMAIL, failure: { ok: false, reason: "expired" } } },
  {
    value: "locked",
    label: "Too many tries",
    start: { step: "code", email: EMAIL, failure: { ok: false, reason: "rate-limited", retryIn: 287 } },
  },
  {
    value: "rate",
    label: "Too many codes asked for",
    start: { step: "email", email: EMAIL, failure: { ok: false, reason: "rate-limited", retryIn: 118 } },
  },
  {
    value: "blocked",
    label: "Email not allowed",
    start: { step: "email", email: "mara.okafor@gmail.com", failure: { ok: false, reason: "not-allowed" } },
  },
  {
    value: "provider",
    label: "Provider failed",
    start: { step: "email", failure: { ok: false, reason: "provider-failed", provider: "github" } },
  },
  {
    value: "send-error",
    label: "Couldn’t send",
    start: { step: "email", email: EMAIL, failure: { ok: false, reason: "error" } },
  },
  { value: "sso", label: "SSO", start: { step: "sso", domain: "" } },
  {
    value: "sso-missing",
    label: "SSO not set up",
    start: { step: "sso", domain: "brightkitchen.co", failure: { ok: false, reason: "not-found" } },
  },
  { value: "done", label: "Signed in", start: { step: "done", success: { method: "code", email: EMAIL } } },
];

/** What the returning person signed in with last time. */
const LAST_USED = [
  { value: "none", label: "Not used before" },
  { value: "email", label: "Last used: email" },
  { value: "google", label: "Last used: Google" },
  { value: "github", label: "Last used: GitHub" },
  { value: "sso", label: "Last used: SSO" },
];

/** Addresses Acme turns away: it's invite-only for personal email. */
const PERSONAL = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"];

const ACME = <AcmeBrand />;

const LEGAL = (
  <>
    By continuing, you agree to Acme’s <a href="#terms">Terms of Service</a> and{" "}
    <a href="#privacy">Privacy Policy</a>.
  </>
);

export function SignInPreview() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [state, setState] = useState("idle");
  const [run, setRun] = useState(0);
  const [lastUsed, setLastUsed] = useState("google");
  const [handoff, setHandoff] = useState<SignInSuccess | null>(null);

  const scenario = STATES.find((s) => s.value === state) ?? STATES[0];
  const slow = scenario.slow ? 5 : 1;

  // The fake server's memory, reset with each run.
  const attempts = useRef(5);
  const sends = useRef(0);
  const githubFailed = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function wait<T>(ms: number, value: T) {
    return new Promise<T>((resolve) => timers.current.push(window.setTimeout(() => resolve(value), ms * slow)));
  }

  function restart(next = state) {
    timers.current.forEach(clearTimeout);
    attempts.current = 5;
    sends.current = 0;
    githubFailed.current = false;
    setHandoff(null);
    setState(next);
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.controls} data-demo-controls="">
          <SegmentedControl
            size="sm"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            aria-label="Wording"
            widths="content"
          >
            <Segment value="sign-in">Sign in</Segment>
            <Segment value="sign-up">Sign up</Segment>
          </SegmentedControl>
          <Select
            size="sm"
            aria-label="State"
            className={own.state}
            value={state}
            onValueChange={restart}
            options={STATES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Select
            size="sm"
            aria-label="Last used"
            value={lastUsed}
            onValueChange={setLastUsed}
            options={LAST_USED}
          />
          <Button variant="secondary" onClick={() => restart()} data-demo-controls="">
            Start over
          </Button>
        </div>

        <div className={own.frame}>
          <SignIn
            key={run}
            mode={mode}
            productName="Acme"
            brand={ACME}
            legal={LEGAL}
            providers={PROVIDERS}
            lastUsed={lastUsed === "none" ? undefined : lastUsed}
            initialState={scenario.start}
            headingLevel={3}
            onModeChange={setMode}
            onSendCode={async (email) => {
              const domain = email.split("@")[1]?.toLowerCase() ?? "";
              sends.current += 1;
              if (PERSONAL.includes(domain))
                return wait(900, {
                  ok: false,
                  reason: "not-allowed",
                  message:
                    mode === "sign-up"
                      ? "Acme is invite-only for personal addresses. Use your work email, or the address your host invite went to."
                      : undefined,
                } as const);
              // The fourth request in a row is refused, the way a real limiter would.
              if (sends.current >= 4) return wait(700, { ok: false, reason: "rate-limited", retryIn: 120 } as const);
              attempts.current = 5;
              return wait(1100, { ok: true, expiresIn: 600, resendIn: 30 } as const);
            }}
            onVerify={async (_email, code) => {
              if (code === "123456") return wait(1200, { ok: true } as const);
              attempts.current -= 1;
              if (attempts.current <= 0) return wait(1000, { ok: false, reason: "rate-limited", retryIn: 300 } as const);
              return wait(1000, { ok: false, reason: "wrong-code", attemptsLeft: attempts.current } as const);
            }}
            onProvider={async (id) => {
              // GitHub's popup "times out" the first time; Google always works.
              if (id === "github" && !githubFailed.current) {
                githubFailed.current = true;
                return wait(1600, { ok: false, reason: "error" } as const);
              }
              return wait(1600, { ok: true, email: EMAIL } as const);
            }}
            onSso={async (domain) =>
              domain === "saturdaysupper.com"
                ? wait(1400, { ok: true } as const)
                : wait(1100, { ok: false, reason: "not-found" } as const)
            }
            onSuccess={setHandoff}
          />
        </div>

        <p className={`${styles.note} ${own.note}`} aria-live="polite">
          {handoff
            ? `onSuccess(${JSON.stringify(handoff)}). A real app navigates from here.`
            : "The code is 123456. A gmail.com address is turned away, GitHub fails the first time, and SSO knows saturdaysupper.com."}
        </p>
      </section>
    </div>
  );
}
