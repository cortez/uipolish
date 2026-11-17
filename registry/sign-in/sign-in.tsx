"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Alert } from "../alert/alert";
import { AnimatedSize } from "../animated-size/animated-size";
import { Button } from "../button/button";
import { CodeInput } from "../code-input/code-input";
import { Icon } from "../icons/icons";
import { TextField } from "../text-field/text-field";
import styles from "./sign-in.module.css";

/* ---------- Public types ---------- */

/** What `onSendCode` resolves with. Throwing counts as `{ ok: false, reason: "error" }`. */
export type SendCodeResult =
  | {
      ok: true;
      /** Seconds until the code stops working. Default 600. */
      expiresIn?: number;
      /** Seconds before another code can be asked for. Default 30. */
      resendIn?: number;
    }
  /** The address can't use the product: a blocked domain, a personal address, or invite-only. */
  | { ok: false; reason: "not-allowed"; message?: string }
  /** Too many codes asked for. */
  | { ok: false; reason: "rate-limited"; retryIn: number }
  | { ok: false; reason: "error"; message?: string };

/** What `onVerify` resolves with. Throwing counts as `{ ok: false, reason: "error" }`. */
export type VerifyResult =
  | { ok: true }
  /** `attemptsLeft: 0` means this code is burned and a new one is needed. */
  | { ok: false; reason: "wrong-code"; attemptsLeft?: number }
  | { ok: false; reason: "expired" }
  /** Too many wrong codes: no more tries, and no new code, until `retryIn` seconds pass. */
  | { ok: false; reason: "rate-limited"; retryIn: number }
  | { ok: false; reason: "error"; message?: string };

/**
 * What `onProvider` resolves with. For a redirect, navigate and leave the
 * promise pending: the button stays busy until the page unloads. For a popup,
 * resolve `ok: true` once signed in, or `cancelled` when the person closed it.
 */
export type ProviderResult =
  | { ok: true; email?: string }
  | { ok: false; reason: "cancelled" }
  | { ok: false; reason: "not-allowed"; message?: string }
  | { ok: false; reason: "error"; message?: string };

/** What `onSso` resolves with. Redirect and leave it pending, as with providers. */
export type SsoResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "error"; message?: string };

export type SignInProvider = {
  id: string;
  /** Shown as "Continue with {name}". */
  name: string;
  /** A 20px mark. Leave it out for a neutral monogram of the first letter. */
  mark?: ReactNode;
};

/** Handed to `onSuccess`: how the person got in. */
export type SignInSuccess =
  | { method: "code"; email: string }
  | { method: "provider"; provider: string; email?: string }
  | { method: "sso"; domain: string };

type Failure<T> = Exclude<T, { ok: true }>;

/** A screen to open on, such as the code step after a reload, or any state in a story or test. */
export type SignInInitialState =
  | {
      step: "email";
      email?: string;
      failure?: Failure<SendCodeResult> | { ok: false; reason: "provider-failed"; provider: string; message?: string };
    }
  | { step: "code"; email: string; expiresIn?: number; resendIn?: number; failure?: Failure<VerifyResult> }
  | { step: "sso"; domain?: string; failure?: Failure<SsoResult> }
  | { step: "done"; success: SignInSuccess };

type SignInProps = {
  /** `sign-up` changes the wording only; the flow is the same. */
  mode?: "sign-in" | "sign-up";
  /** Your product's name, used in the copy: "Sign in to Acme". */
  productName: string;
  /** Your logo or wordmark, centered above the heading. */
  brand?: ReactNode;
  /** Terms and privacy links, at the foot of the card. */
  legal?: ReactNode;
  /** Ask your server to email a code. */
  onSendCode: (email: string) => Promise<SendCodeResult>;
  /** Check the code. Resolve `ok: true` once the session exists. */
  onVerify: (email: string, code: string) => Promise<VerifyResult>;
  /** OAuth buttons, in order. Needs `onProvider`. */
  providers?: SignInProvider[];
  onProvider?: (id: string) => Promise<ProviderResult>;
  /** How this person signed in last time, from your own record (a cookie or
   *  local storage): "email", "sso" or a provider's id. A muted line under
   *  that option's group says "You last signed in with Google.", so a
   *  returning person picks it without thinking. */
  lastUsed?: string;
  /** Shows "Continue with SSO", which asks for the work domain. */
  onSso?: (domain: string) => Promise<SsoResult>;
  /** Called once, after the success screen shows. Navigate from here. */
  onSuccess?: (success: SignInSuccess) => void;
  /** Shows "New to Acme? Create an account" (or the reverse) under the form. */
  onModeChange?: (mode: "sign-in" | "sign-up") => void;
  /** Digits in the code. Default 6. */
  codeLength?: number;
  initialState?: SignInInitialState;
  /** Focus the first field on mount. Steps after the first always move focus. */
  autoFocus?: boolean;
  /** Fill the viewport's height and center in it, for a page of its own. */
  fullPage?: boolean;
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

/* ---------- Internal state ---------- */

type EmailNotice =
  | { kind: "not-allowed"; email: string; message?: string }
  | { kind: "rate-limited"; retryAt: number; retryIn: number }
  | { kind: "error"; message?: string }
  | { kind: "provider-failed"; provider: string; message?: string };

type CodeNotice =
  | { kind: "wrong-code"; attemptsLeft?: number }
  | { kind: "expired" }
  | { kind: "rate-limited"; retryAt: number; retryIn: number }
  | { kind: "error"; message?: string }
  | { kind: "incomplete" };

type View =
  | { step: "email"; notice?: EmailNotice }
  | { step: "code"; email: string; expiresAt: number; expiresIn: number; resendAt: number; resent: number; notice?: CodeNotice }
  | { step: "sso"; notice?: { kind: "not-found"; domain: string } | { kind: "error"; message?: string } }
  | { step: "done"; success: SignInSuccess };

type Busy = null | "send" | "verify" | "resend" | "sso" | `provider:${string}`;

const EXPIRES_IN = 600;
const RESEND_IN = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialView(start: SignInInitialState | undefined, providers: SignInProvider[]): View {
  const now = Date.now();
  if (!start) return { step: "email" };
  switch (start.step) {
    case "email": {
      const f = start.failure;
      if (!f) return { step: "email" };
      if (f.reason === "provider-failed")
        return { step: "email", notice: { kind: "provider-failed", provider: providerName(providers, f.provider), message: f.message } };
      return { step: "email", notice: sendNotice(f, start.email ?? "", now) };
    }
    case "code": {
      const expiresIn = start.expiresIn ?? EXPIRES_IN;
      return {
        step: "code",
        email: start.email,
        expiresIn,
        expiresAt: now + expiresIn * 1000,
        resendAt: now + (start.resendIn ?? RESEND_IN) * 1000,
        resent: 0,
        notice: start.failure && verifyNotice(start.failure, now),
      };
    }
    case "sso":
      return { step: "sso", notice: start.failure && ssoNotice(start.failure, start.domain ?? "") };
    case "done":
      return { step: "done", success: start.success };
  }
}

function sendNotice(f: Failure<SendCodeResult>, email: string, now: number): EmailNotice {
  if (f.reason === "not-allowed") return { kind: "not-allowed", email, message: f.message };
  if (f.reason === "rate-limited") return { kind: "rate-limited", retryAt: now + f.retryIn * 1000, retryIn: f.retryIn };
  return { kind: "error", message: f.message };
}

function verifyNotice(f: Failure<VerifyResult>, now: number): CodeNotice {
  if (f.reason === "wrong-code") return { kind: "wrong-code", attemptsLeft: f.attemptsLeft };
  if (f.reason === "expired") return { kind: "expired" };
  if (f.reason === "rate-limited") return { kind: "rate-limited", retryAt: now + f.retryIn * 1000, retryIn: f.retryIn };
  return { kind: "error", message: f.message };
}

function ssoNotice(f: Failure<SsoResult>, domain: string): Extract<View, { step: "sso" }>["notice"] {
  return f.reason === "not-found" ? { kind: "not-found", domain } : { kind: "error", message: f.message };
}

function providerName(providers: SignInProvider[], id: string) {
  return providers.find((p) => p.id === id)?.name ?? id;
}

/** The bare domain in "acme.com", "https://acme.com/" or "mara@acme.com". */
function toDomain(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^.*@/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

/** 0:42, 4:05, or "1 hr 5 min" past the hour. */
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} hr ${Math.floor((s % 3600) / 60)} min`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** For screen readers, said once: "about 3 minutes". */
function roughly(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} seconds`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `about ${min} minute${min === 1 ? "" : "s"}`;
  const hr = Math.round(min / 60);
  return `about ${hr} hour${hr === 1 ? "" : "s"}`;
}

/** Ticks after mount only, so the server and the first client render agree. */
function useNow(on: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [on]);
  return now;
}

/* ---------- Component ---------- */

/** The sign-in or sign-up screen: work email, then a one-time code, with optional OAuth providers and SSO. */
export function SignIn({
  mode = "sign-in",
  productName,
  brand,
  legal,
  onSendCode,
  onVerify,
  providers = [],
  onProvider,
  onSso,
  lastUsed,
  onSuccess,
  onModeChange,
  codeLength = 6,
  initialState,
  autoFocus = false,
  fullPage = false,
  headingLevel = 1,
  className,
}: SignInProps) {
  const H = `h${headingLevel}` as "h1";
  const titleId = useId();
  const [view, setView] = useState<View>(() => initialView(initialState, providers));
  const [email, setEmail] = useState(() =>
    initialState?.step === "email" || initialState?.step === "code" ? (initialState.email ?? "") : "",
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [domain, setDomain] = useState(() => (initialState?.step === "sso" ? (initialState.domain ?? "") : ""));
  const [domainError, setDomainError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [announce, setAnnounce] = useState("");

  const signUp = mode === "sign-up";
  const showProviders = providers.length > 0 && Boolean(onProvider);
  const lastUsedId = useId();
  // The provider or SSO option signed in with last, named under the buttons.
  const lastOther =
    lastUsed === "sso" && onSso
      ? "SSO"
      : showProviders
        ? providers.find((p) => p.id === lastUsed)?.name
        : undefined;

  // Bumped whenever the person leaves a step, so a late answer for it is dropped.
  const epoch = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const domainRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  // Ticks only while something on screen counts down.
  const counting =
    (view.step === "email" && view.notice?.kind === "rate-limited") || view.step === "code";
  const now = useNow(counting);

  /* Focus follows the step: into its first field, or onto the heading once done. */
  const firstStep = useRef(true);
  useLayoutEffect(() => {
    const first = firstStep.current;
    firstStep.current = false;
    if (first && !autoFocus) return;
    if (view.step === "email") emailRef.current?.focus();
    else if (view.step === "code") codeRef.current?.querySelector("input")?.focus();
    else if (view.step === "sso") domainRef.current?.focus();
    else headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change of step moves focus
  }, [view.step]);

  // Bumped to send focus back to the code's first empty box, after a wrong code or a resend.
  const [codeFocus, setCodeFocus] = useState(0);
  useLayoutEffect(() => {
    if (codeFocus) codeRef.current?.querySelector("input")?.focus();
  }, [codeFocus]);

  // Steps after the first fade up into place.
  const [moves, setMoves] = useState(0);

  /* Hand off once, after the success screen has painted. */
  const handedOff = useRef(false);
  useEffect(() => {
    if (view.step !== "done" || handedOff.current) return;
    handedOff.current = true;
    onSuccess?.(view.success);
  }, [view, onSuccess]);

  /** Runs one request; drops its answer if the person moved on or the block unmounted. */
  async function request<T>(key: Exclude<Busy, null>, fn: () => Promise<T>): Promise<T | { ok: false; reason: "error"; message?: string } | null> {
    const at = epoch.current;
    setBusy(key);
    let result: T | { ok: false; reason: "error"; message?: string };
    try {
      result = await fn();
    } catch {
      result = { ok: false, reason: "error" };
    }
    if (!mounted.current || at !== epoch.current) return null;
    setBusy(null);
    return result;
  }

  function leave(next: View) {
    epoch.current++;
    setBusy(null);
    setView(next);
    setMoves((n) => n + 1);
  }

  /* ----- Email ----- */

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setEmailError(address ? "Enter a full email, like name@company.com." : "Enter your work email.");
      emailRef.current?.focus();
      return;
    }
    if (view.step === "email" && view.notice?.kind === "rate-limited" && now !== null && now < view.notice.retryAt) return;
    setEmailError(null);
    const result = await request("send", () => onSendCode(address));
    if (!result) return;
    const t = Date.now();
    if (result.ok) {
      const expiresIn = result.expiresIn ?? EXPIRES_IN;
      setCode("");
      leave({
        step: "code",
        email: address,
        expiresIn,
        expiresAt: t + expiresIn * 1000,
        resendAt: t + (result.resendIn ?? RESEND_IN) * 1000,
        resent: 0,
      });
      setAnnounce(`We sent a ${codeLength}-digit code to ${address}.`);
    } else {
      setView({ step: "email", notice: sendNotice(result, address, t) });
    }
  }

  async function provider(p: SignInProvider) {
    if (busy || !onProvider) return;
    const result = await request(`provider:${p.id}`, () => onProvider(p.id));
    if (!result) return;
    if (result.ok) leave({ step: "done", success: { method: "provider", provider: p.id, email: result.email } });
    else if (result.reason === "cancelled") setView({ step: "email" });
    else if (result.reason === "not-allowed")
      setView({ step: "email", notice: { kind: "not-allowed", email: "", message: result.message } });
    else setView({ step: "email", notice: { kind: "provider-failed", provider: p.name, message: result.message } });
  }

  /* ----- Code ----- */

  const codeView = view.step === "code" ? view : null;
  const expired =
    codeView !== null && (codeView.notice?.kind === "expired" || (now !== null && now >= codeView.expiresAt));
  const locked =
    codeView?.notice?.kind === "rate-limited" && (now === null || now < codeView.notice.retryAt);
  const burned = codeView?.notice?.kind === "wrong-code" && codeView.notice.attemptsLeft === 0;
  const needsNewCode = expired || burned || codeView?.notice?.kind === "rate-limited";

  async function verify(value: string) {
    if (busy || !codeView || needsNewCode) return;
    if (value.length < codeLength) {
      setView({ ...codeView, notice: { kind: "incomplete" } });
      setCodeFocus((n) => n + 1);
      return;
    }
    const at = codeView;
    const result = await request("verify", () => onVerify(at.email, value));
    if (!result) return;
    if (result.ok) {
      leave({ step: "done", success: { method: "code", email: at.email } });
      return;
    }
    const notice = verifyNotice(result, Date.now());
    setView({ ...at, notice });
    // A wrong code is cleared so the next one can be typed straight in.
    if (notice.kind === "wrong-code" || notice.kind === "error") {
      setCode("");
      setCodeFocus((n) => n + 1);
    }
  }

  async function resend() {
    if (busy || !codeView) return;
    const at = codeView;
    const result = await request("resend", () => onSendCode(at.email));
    if (!result) return;
    const t = Date.now();
    if (result.ok) {
      const expiresIn = result.expiresIn ?? EXPIRES_IN;
      setCode("");
      setView({
        ...at,
        expiresIn,
        expiresAt: t + expiresIn * 1000,
        resendAt: t + (result.resendIn ?? RESEND_IN) * 1000,
        resent: at.resent + 1,
        notice: undefined,
      });
      setCodeFocus((n) => n + 1);
    } else if (result.reason === "rate-limited") {
      setView({ ...at, notice: { kind: "rate-limited", retryAt: t + result.retryIn * 1000, retryIn: result.retryIn } });
    } else {
      setView({ ...at, notice: { kind: "error", message: result.message ?? "Couldn’t send a new code. Check your connection and try again." } });
    }
  }

  function changeCode(next: string) {
    if (busy === "verify") return;
    setCode(next);
    // Typing clears a complaint about the last code, not one about the code itself.
    const kind = codeView?.notice?.kind;
    if (codeView && (kind === "wrong-code" || kind === "error" || kind === "incomplete") && !burned)
      setView({ ...codeView, notice: undefined });
  }

  function differentEmail() {
    leave({ step: "email" });
    setCode("");
  }

  /* ----- SSO ----- */

  function openSso() {
    if (busy) return;
    if (!domain && EMAIL.test(email.trim())) setDomain(toDomain(email));
    leave({ step: "sso" });
  }

  async function sso(event: FormEvent) {
    event.preventDefault();
    if (busy || !onSso) return;
    const d = toDomain(domain);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) {
      setDomainError(d ? "Enter a domain, like company.com." : "Enter your work email or company domain.");
      domainRef.current?.focus();
      return;
    }
    setDomainError(null);
    const result = await request("sso", () => onSso(d));
    if (!result) return;
    if (result.ok) leave({ step: "done", success: { method: "sso", domain: d } });
    else setView({ step: "sso", notice: ssoNotice(result, d) });
  }

  /* ---------- Render ---------- */

  let body: ReactNode;

  if (view.step === "email") {
    const notice = view.notice;
    const limited = notice?.kind === "rate-limited" && (now === null || now < notice.retryAt);
    const alert = notice && !(notice.kind === "rate-limited" && !limited) ? emailAlert(notice, productName, signUp, now) : null;
    // A provider's failure shows under the providers, next to the button that was pressed.
    const fromProvider = notice?.kind === "provider-failed" || (notice?.kind === "not-allowed" && !notice.email);
    body = (
      <div key="email" className={styles.body} data-enter={moves ? "" : undefined}>
        <div className={styles.head}>
          <H id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
            {signUp ? `Create your ${productName} account` : `Sign in to ${productName}`}
          </H>
          <p className={styles.sub}>
            {signUp
              ? "Start with your work email. We’ll send you a code, so there’s no password to remember."
              : "Use your work email and we’ll send you a code. No password needed."}
          </p>
        </div>

        <form className={styles.form} onSubmit={sendCode} noValidate>
          <TextField
            ref={emailRef}
            label="Work email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@company.com"
            value={email}
            error={emailError}
            onChange={(e) => {
              setEmail(e.currentTarget.value);
              if (emailError) setEmailError(null);
              if (view.notice && view.notice.kind !== "rate-limited") setView({ step: "email" });
            }}
          />
          <div className={styles.actions}>
            <Button
              type="submit"
              className={styles.wide}
              aria-describedby={lastUsed === "email" ? lastUsedId : undefined}
              busy={busy === "send"} busyLabel="Sending code…" disabled={limited}>
              Continue with email
            </Button>
            {lastUsed === "email" && <LastUsed id={lastUsedId} name="email" />}
            <Alert
              className={styles.notice}
              open={Boolean(alert) && !fromProvider}
              arrive="expand"
              tone={alert?.tone ?? "error"}
              title={alert?.title ?? ""}
            >
              {alert?.body}
            </Alert>
          </div>
        </form>

        {(showProviders || onSso) && (
          <>
            <div className={styles.or} role="separator">
              <span>or</span>
            </div>
            <div className={styles.others}>
              {showProviders &&
                providers.map((p) => (
                  <Button
                    key={p.id}
                    variant="secondary"
                    className={styles.wide}
                    busy={busy === `provider:${p.id}`}
                    busyLabel={
                      <>
                        <Mark provider={p} />
                        Opening {p.name}…
                      </>
                    }
                    aria-describedby={lastUsed === p.id ? lastUsedId : undefined}
                    onClick={() => provider(p)}
                  >
                    <Mark provider={p} />
                    Continue with {p.name}
                  </Button>
                ))}
              {onSso && (
                <Button
                  variant="secondary"
                  className={styles.wide}
                  aria-describedby={lastUsed === "sso" ? lastUsedId : undefined}
                  onClick={openSso}
                >
                  <span className={styles.mark} aria-hidden="true">
                    <SsoGlyph />
                  </span>
                  Continue with SSO
                </Button>
              )}
              {lastOther && <LastUsed id={lastUsedId} name={lastOther} />}
              <Alert
                className={styles.notice}
                open={Boolean(alert) && fromProvider}
                arrive="expand"
                tone={alert?.tone ?? "error"}
                title={alert?.title ?? ""}
              >
                {alert?.body}
              </Alert>
            </div>
          </>
        )}

        {onModeChange && (
          <p className={styles.switch}>
            {signUp ? "Already have an account? " : `New to ${productName}? `}
            <button type="button" className={styles.link} onClick={() => onModeChange(signUp ? "sign-in" : "sign-up")}>
              {signUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        )}
      </div>
    );
  } else if (view.step === "code") {
    const notice = view.notice;
    const canResend = needsNewCode ? !locked : now !== null && now >= view.resendAt;
    const waitMs = locked && notice?.kind === "rate-limited" ? notice.retryAt - (now ?? 0) : view.resendAt - (now ?? 0);
    body = (
      <div key="code" className={styles.body} data-enter={moves ? "" : undefined}>
        <div className={styles.head}>
          <H id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
            Check your email
          </H>
          <p className={styles.sub}>
            Enter the {codeLength}-digit code we sent to <strong className={styles.address}>{view.email}</strong>
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (needsNewCode) resend();
            else verify(code);
          }}
        >
          <div ref={codeRef} className={styles.code}>
            <CodeInput
              label="Verification code"
              length={codeLength}
              value={code}
              onValueChange={changeCode}
              onComplete={verify}
              disabled={locked}
              hint={
                view.resent
                  ? `We sent a new code. Earlier codes no longer work.`
                  : `It expires in ${roughly(view.expiresIn).replace("about ", "")}. Check spam if it isn’t there.`
              }
              error={codeError(notice, expired, codeLength)}
            />
          </div>
          <div className={styles.actions}>
            {needsNewCode ? (
              <Button
                type="submit"
                className={styles.wide}
                busy={busy === "resend"}
                busyLabel="Sending…"
                disabled={!canResend}
              >
                {locked ? <Countdown label="Send a new code in" ms={waitMs} known={now !== null} /> : "Send a new code"}
              </Button>
            ) : (
              <Button type="submit" className={styles.wide} busy={busy === "verify"} busyLabel="Checking code…">
                {signUp ? "Create account" : "Sign in"}
              </Button>
            )}
          </div>
        </form>

        <div className={styles.links}>
          <Button variant="ghost" onClick={differentEmail}>
            <Icon name="arrow-left" />
            Use a different email
          </Button>
          {!needsNewCode && (
            <Button
              variant="ghost"
              disabled={!canResend}
              busy={busy === "resend"}
              busyLabel="Sending…"
              onClick={resend}
            >
              {canResend ? "Resend code" : <Countdown label="Resend in" ms={waitMs} known={now !== null} />}
            </Button>
          )}
        </div>
      </div>
    );
  } else if (view.step === "sso") {
    const notice = view.notice;
    body = (
      <div key="sso" className={styles.body} data-enter={moves ? "" : undefined}>
        <div className={styles.head}>
          <H id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
            {signUp ? "Sign up with SSO" : "Sign in with SSO"}
          </H>
          <p className={styles.sub}>Enter your work email or your company’s domain. We’ll take you to its sign-in page.</p>
        </div>
        <form className={styles.form} onSubmit={sso} noValidate>
          <TextField
            ref={domainRef}
            label="Work email or domain"
            name="domain"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="company.com"
            value={domain}
            error={
              domainError ??
              (notice?.kind === "not-found"
                ? `${notice.domain} hasn’t set up SSO with ${productName}. Check the spelling, or go back and use your email.`
                : notice?.kind === "error"
                  ? (notice.message ?? "Couldn’t reach your company’s sign-in page. Try again in a moment.")
                  : null)
            }
            onChange={(e) => {
              setDomain(e.currentTarget.value);
              if (domainError) setDomainError(null);
              if (notice) setView({ step: "sso" });
            }}
          />
          <div className={styles.actions}>
            <Button type="submit" className={styles.wide} busy={busy === "sso"} busyLabel="Finding your company…">
              Continue
            </Button>
          </div>
        </form>
        <div className={styles.links} data-single>
          <Button variant="ghost" onClick={() => leave({ step: "email" })}>
            <Icon name="arrow-left" />
            Other ways to {signUp ? "sign up" : "sign in"}
          </Button>
        </div>
      </div>
    );
  } else {
    const s = view.success;
    body = (
      <div key="done" className={styles.body} data-enter={moves ? "" : undefined}>
        <div className={styles.head}>
          <span className={styles.done} aria-hidden="true">
            <Icon name="check" />
          </span>
          <H id={titleId} ref={headingRef} tabIndex={-1} className={styles.title}>
            {signUp ? "Your account is ready" : "You’re signed in"}
          </H>
          {(s.method === "code" || (s.method === "provider" && s.email)) && (
            <p className={styles.sub}>
              <strong className={styles.address}>{s.email}</strong>
            </p>
          )}
          <p className={`${styles.sub} ${styles.sweep}`}>Opening {productName}…</p>
        </div>
      </div>
    );
  }

  return (
    <section
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-full-page={fullPage || undefined}
      data-step={view.step}
      aria-labelledby={titleId}
      aria-busy={busy ? true : undefined}
    >
      <div className={styles.card}>
        {brand && <div className={styles.brand}>{brand}</div>}
        <AnimatedSize>{body}</AnimatedSize>
        {legal && <div className={styles.legal}>{legal}</div>}
      </div>
      <span role="status" className={styles.srOnly}>
        {view.step === "done" ? (signUp ? "Account created." : "Signed in.") : announce}
      </span>
    </section>
  );
}

function codeError(notice: CodeNotice | undefined, expired: boolean, length: number) {
  if (notice?.kind === "rate-limited")
    return `Too many tries. You can ask for a new code in ${roughly(notice.retryIn)}.`;
  if (notice?.kind === "wrong-code") {
    const n = notice.attemptsLeft;
    if (n === 0) return "That code didn’t match, and it can’t be tried again. Send a new code.";
    if (n === undefined) return "That code didn’t match. Check the latest email and try again.";
    return `That code didn’t match. ${n} ${n === 1 ? "try" : "tries"} left.`;
  }
  if (expired) return "This code has expired. Send a new one to keep going.";
  if (notice?.kind === "incomplete") return `Enter all ${length} digits.`;
  if (notice?.kind === "error") return notice.message ?? "Couldn’t check the code. Check your connection and try again.";
  return null;
}

function emailAlert(notice: EmailNotice, product: string, signUp: boolean, now: number | null) {
  switch (notice.kind) {
    case "not-allowed":
      return {
        tone: "warning" as const,
        title: notice.email ? `${notice.email} can’t ${signUp ? "sign up" : "sign in"} here` : `That account can’t ${signUp ? "sign up" : "sign in"} here`,
        body:
          notice.message ??
          (signUp
            ? `${product} is invite-only for now. Ask someone on your team to invite you, then use the email the invite went to.`
            : `There’s no ${product} account for it. Check for typos, or ask your workspace admin to invite you.`),
      };
    case "rate-limited":
      return {
        tone: "warning" as const,
        title: "Too many codes asked for",
        body: (
          <>
            For your security, wait{" "}
            <Countdown ms={notice.retryAt - (now ?? 0)} known={now !== null} spoken={roughly(notice.retryIn)} />{" "}
            before asking for another.
          </>
        ),
      };
    case "provider-failed":
      return {
        tone: "error" as const,
        title: `Signing in with ${notice.provider} didn’t finish`,
        body: notice.message ?? `${notice.provider} didn’t send you back to ${product}. Try again, or continue with your email.`,
      };
    case "error":
      return {
        tone: "error" as const,
        title: "Couldn’t send the code",
        body: notice.message ?? `${product} didn’t answer. Check your connection and try again.`,
      };
  }
}

/** A ticking m:ss, shown to the eye; screen readers get `spoken` once instead of every second. */
function Countdown({ label, ms, known, spoken }: { label?: string; ms: number; known: boolean; spoken?: string }) {
  return (
    <span className={styles.countdown}>
      {label && `${label} `}
      <span aria-hidden={spoken ? true : undefined}>{known ? clock(ms) : "–:––"}</span>
      {spoken && <span className={styles.srOnly}>{spoken}</span>}
    </span>
  );
}

/** A quiet line under the buttons, so every button keeps the same size and
 *  label position. The button it names points at it with aria-describedby:
 *  "Continue with Google, button, You last signed in with Google." */
function LastUsed({ id, name }: { id: string; name: string }) {
  return (
    <p id={id} className={styles.lastUsed}>
      You last signed in with {name}.
    </p>
  );
}

/** A neutral letter tile when no mark is passed. provider-marks.tsx has Google, GitHub and Microsoft. */
function Mark({ provider }: { provider: SignInProvider }) {
  return (
    <span className={styles.mark} data-monogram={provider.mark ? undefined : ""} aria-hidden="true">
      {provider.mark ?? provider.name.trim().charAt(0).toLocaleUpperCase()}
    </span>
  );
}

function SsoGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" style={{ strokeWidth: "var(--ui-icon-stroke-medium)" }} strokeLinejoin="round">
      <path d="M3 13.5V4.5l5-2 5 2v9" />
      <path d="M1.5 13.5h13M6 6.5h1M9 6.5h1M6 9h1M9 9h1M7.25 13.5v-2h1.5v2" strokeLinecap="round" />
    </svg>
  );
}
