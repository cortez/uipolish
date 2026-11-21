/* ISO day strings ("2026-11-14") worked on as UTC midnights, so no time zone
   or daylight saving change can move a day. Shared by the date picker and
   the calendar. */

export const DAY = 86_400_000;

export const toTime = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const addDays = (iso: string, by: number) => toIso(toTime(iso) + by * DAY);

/** The same day `by` months on, or the month's last day when it has fewer. */
export function addMonths(iso: string, by: number) {
  const d = new Date(toTime(iso));
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return toIso(target.getTime());
}
