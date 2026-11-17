/* Times as the sidebar, tabs and footers show them. Client and server. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "now", "4m", "2h", "3d", "2w": a session's last activity, in the sidebar. */
export function relativeTime(at: number, now = Date.now()) {
  const ago = Math.max(0, now - at);
  if (ago < MINUTE) return "now";
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)}m`;
  if (ago < DAY) return `${Math.floor(ago / HOUR)}h`;
  if (ago < 14 * DAY) return `${Math.floor(ago / DAY)}d`;
  return `${Math.floor(ago / (7 * DAY))}w`;
}

/** The same, in words, for screen readers and titles: "2 hours ago". */
export function relativeWords(at: number, now = Date.now()) {
  const short = relativeTime(at, now);
  if (short === "now") return "just now";
  const n = parseInt(short, 10);
  const unit = { m: "minute", h: "hour", d: "day", w: "week" }[short.slice(-1)] ?? "minute";
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/** A first prompt as a title: its first line, cut on a word near 48 characters. */
export function titleFrom(text: string) {
  const line = text.split("\n")[0].replace(/\s+/g, " ").trim();
  if (line.length <= 48) return line.replace(/[.!?]+$/, "");
  const cut = line.lastIndexOf(" ", 46);
  return line.slice(0, cut > 20 ? cut : 46).replace(/[\s.,;:!?-]+$/, "") + "…";
}
