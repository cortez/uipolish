// Pure helpers for the invite field: splitting pasted text, checking each
// address and saying what's wrong with the ones that can't be sent.

export type EmailEntry = {
  /** As typed, trimmed: what the chip shows. */
  email: string;
  /** Lowercased, for comparing. */
  key: string;
  /** Why it can't be invited, in a few words; null when it can. */
  problem: string | null;
};

/** Commas, semicolons, spaces and new lines all separate addresses. */
const SEPARATOR = /[\s,;]+/;

// Deliberately loose: one @, something on each side, a dot in the domain.
// The server is the real judge; this only catches typos before they're sent.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

/** Splits text into addresses. "Maya Lind <maya@acme.co>" becomes "maya@acme.co". */
export function splitEmails(text: string): string[] {
  // Pull out bracketed addresses first, so the display names around them fall away.
  const bracketed = text.replace(/[^<>,;\n]*<([^<>]+)>/g, " $1 ");
  return bracketed
    .split(SEPARATOR)
    .map((part) => part.replace(/^mailto:/i, "").replace(/^["'(]+|["').]+$/g, "").trim())
    .filter(Boolean);
}

export function isEmail(text: string) {
  return EMAIL.test(text);
}

/**
 * Checks addresses against the ones already in the field, the workspace's
 * members and its pending invites. Duplicates within the field are dropped,
 * not flagged: pasting the same list twice should just work.
 */
export function checkEmails(
  incoming: string[],
  current: EmailEntry[],
  taken: { members: ReadonlySet<string>; invited: ReadonlySet<string> },
): { added: EmailEntry[]; duplicates: number } {
  const seen = new Set(current.map((e) => e.key));
  const added: EmailEntry[] = [];
  let duplicates = 0;
  for (const email of incoming) {
    const key = email.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    let problem: string | null = null;
    if (!isEmail(email)) problem = email.includes("@") ? "isn’t a full address" : "isn’t an email address";
    else if (taken.members.has(key)) problem = "is already a member";
    else if (taken.invited.has(key)) problem = "already has an invite";
    added.push({ email, key, problem });
  }
  return { added, duplicates };
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
