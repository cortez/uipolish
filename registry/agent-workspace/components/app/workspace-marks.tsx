import { Avatar } from "@/components/ui/avatar/avatar";
import type { Person } from "@/lib/coding/session";
import styles from "./workspace.module.css";

/* The product's mark and a teammate's face with their presence. */

/** The product's mark, on the switcher's round tile and the sign-in page: two brackets around a spark. Swap in your own. */
export function WorkspaceMark() {
  return (
    <svg viewBox="0 0 16 16" className={styles.mark} aria-hidden="true">
      <path d="M5 3.5 2.5 8 5 12.5M11 3.5 13.5 8 11 12.5M8 5.25v5.5M5.6 6.6l4.8 2.8M10.4 6.6l-4.8 2.8" />
    </svg>
  );
}

const PRESENCE_WORDS: Record<Person["presence"], string> = { online: "Online", away: "Away", offline: "Offline" };

export const presenceWord = (p: Person["presence"]) => PRESENCE_WORDS[p];

/** A 20px face with a dot for presence: green online, amber away, none offline. Decorative: say the presence in words beside it. */
export function PresenceAvatar({ person }: { person: Person }) {
  return (
    <span className={styles.presence} data-presence={person.presence}>
      <Avatar name={person.name} size={20} decorative />
    </span>
  );
}
