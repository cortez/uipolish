import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SendCodeResult, VerifyResult } from "@/components/ui/sign-in/sign-in";

/* Sign-in with an emailed code, and a signed cookie for the session.

   The default sender is for development: it prints the code in the server's
   terminal instead of emailing it, and refuses to run in production unless
   ALLOW_DEV_SIGN_IN=1. To go live, keep this file's shape and swap the
   parts:
   - Email: replace sendEmail() with your provider (Resend, Postmark, SES).
   - Or a whole auth library (Auth.js, Clerk, WorkOS, Supabase Auth): make
     getUser() return its user and point the sign-in page at its flow.
   Set SESSION_SECRET to a long random string in every deployed environment. */

export type User = { id: string; email: string; name: string };

const COOKIE = "workspace_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_TRIES = 5;

export const devSignIn = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_SIGN_IN === "1";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && !devSignIn) throw new Error("Set SESSION_SECRET to sign session cookies.");
  return "dev-only-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** The signed-in person, or null. */
export async function getUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { user, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { user: User; exp: number };
    return exp > Date.now() ? user : null;
  } catch {
    return null;
  }
}

/** For pages and layouts: the person, or a redirect to sign in. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

async function startSession(user: User) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ user, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/* ---------- Codes ---------- */

type Pending = { code: string; expiresAt: number; tries: number; sentAt: number[] };
const g = globalThis as { __signInCodes?: Map<string, Pending> };
const pending = (g.__signInCodes ??= new Map<string, Pending>());

async function sendEmail(email: string, code: string) {
  // Development: the code goes to the terminal running the app.
  console.info(`\n[auth] Sign-in code for ${email}: ${code} (valid ${CODE_MINUTES} minutes)\n`);
}

export async function sendCode(rawEmail: string): Promise<SendCodeResult> {
  if (!devSignIn) {
    return { ok: false, reason: "not-allowed", message: "Sign-in isn’t set up for production yet. See lib/coding/auth.ts." };
  }
  const email = rawEmail.trim().toLowerCase();
  const now = Date.now();
  const recent = (pending.get(email)?.sentAt ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return { ok: false, reason: "rate-limited", retryIn: Math.ceil((recent[0] + 10 * 60 * 1000 - now) / 1000) };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  pending.set(email, { code, expiresAt: now + CODE_MINUTES * 60 * 1000, tries: 0, sentAt: [...recent, now] });
  await sendEmail(email, code);
  return { ok: true, expiresIn: CODE_MINUTES * 60, resendIn: 30 };
}

export async function verifyCode(rawEmail: string, code: string): Promise<VerifyResult> {
  const email = rawEmail.trim().toLowerCase();
  const entry = pending.get(email);
  if (!entry || entry.expiresAt < Date.now()) return { ok: false, reason: "expired" };
  if (entry.code !== code) {
    entry.tries += 1;
    const attemptsLeft = MAX_TRIES - entry.tries;
    if (attemptsLeft <= 0) pending.delete(email);
    return { ok: false, reason: "wrong-code", attemptsLeft: Math.max(0, attemptsLeft) };
  }
  pending.delete(email);
  await startSession({ id: email, email, name: nameFrom(email) });
  return { ok: true };
}

/** "ana.ruiz@acme.com" → "Ana Ruiz", until people can set their name. */
function nameFrom(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}
