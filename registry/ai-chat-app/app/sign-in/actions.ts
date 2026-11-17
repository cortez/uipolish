"use server";

import { sendCode, verifyCode } from "@/lib/auth";

/* The sign-in block's two calls, on the server. lib/auth.ts decides. */

export async function requestCode(email: string) {
  return sendCode(email);
}

export async function checkCode(email: string, code: string) {
  return verifyCode(email, code);
}
