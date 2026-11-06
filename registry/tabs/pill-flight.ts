/* The pill's flight from one item to the next, shared by Tabs and the
   Segmented control so the two move as one family. The resting position is
   the caller's; this plays the move between two spans on top of it. */

/** A pill's offset and length along its track, and how far it's dipped. */
export type PillSpan = { start: number; length: number; dip?: number };

/** How deep the pill dips mid-flight, in px: none. A dip (and a spring on
 *  the leading edge) read as organic, a blob more than a control. */
const MAX_DIP = 0;

function token(el: Element, name: string, fallback: string) {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function ms(value: string) {
  return value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
}

/** A `linear(...)` easing token as a function of progress, for sampling in JS. */
function curve(value: string): (t: number) => number {
  const points = value.startsWith("linear(") ? value.slice(7, -1).split(",").map(parseFloat) : [];
  if (points.length < 2 || points.some(Number.isNaN)) return (t) => 1 - (1 - t) ** 3;
  return (t) => {
    const at = Math.min(Math.max(t, 0), 1) * (points.length - 1);
    const i = Math.min(Math.floor(at), points.length - 2);
    return points[i] + (points[i + 1] - points[i]) * (at - i);
  };
}

/** Where the pill is along its track right now, mid-animation included. */
function translated(el: HTMLElement, vertical: boolean) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return 0;
  const matrix = new DOMMatrixReadOnly(transform);
  return vertical ? matrix.m42 : matrix.m41;
}

/** Stops a flight in progress and returns where it left the pill on screen, or null if it was still. */
export function stopPill(indicator: HTMLElement, vertical = false): PillSpan | null {
  const running = indicator.getAnimations();
  if (!running.length) return null;
  const box = indicator.getBoundingClientRect();
  const span = {
    start: translated(indicator, vertical),
    length: vertical ? box.height : box.width,
    dip: Math.max(0, vertical ? indicator.offsetWidth - box.width : indicator.offsetHeight - box.height),
  };
  running.forEach((a) => a.cancel());
  return span;
}

/**
 * Flies the pill from one span to another: the edge facing the new item
 * leads, the far edge follows, both on the glide (no overshoot), so the
 * pill stretches a little toward the new item and settles once. Length
 * animates, not scale, which would squash the round ends. Under reduced
 * motion it doesn't play.
 */
export function flyPill(indicator: HTMLElement, from: PillSpan, to: PillSpan, vertical = false) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const duration = ms(token(indicator, "--ui-dur-glide", "320ms"));
  const lead = curve(token(indicator, "--ui-ease-glide", ""));
  const follow = curve(token(indicator, "--ui-ease-glide", ""));
  const leadShare = ms(token(indicator, "--ui-dur-snap", "250ms")) / duration;
  const forward = to.start > from.start;
  const fromDip = from.dip ?? 0;
  // The dip only ever shrinks the pill, so nothing pokes out of the track.
  const full = vertical ? indicator.offsetWidth : indicator.offsetHeight;
  const travel = Math.abs(to.start + to.length / 2 - (from.start + from.length / 2));
  const dip = Math.min(MAX_DIP, travel / 30);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const fast = lead(Math.min(t / leadShare, 1));
    const slow = follow(t);
    const near = from.start + (to.start - from.start) * (forward ? slow : fast);
    const far = from.start + from.length + (to.start + to.length - from.start - from.length) * (forward ? fast : slow);
    const p = Math.min(Math.max((fast + slow) / 2, 0), 1);
    const d = fromDip * (1 - p) + dip * Math.sin(Math.PI * p);
    frames.push(
      vertical
        ? { transform: `translate(${d / 2}px, ${near}px)`, height: `${far - near}px`, width: `${full - d}px` }
        : { transform: `translate(${near}px, ${d / 2}px)`, width: `${far - near}px`, height: `${full - d}px` },
    );
  }
  indicator.animate(frames, { duration, easing: "linear" });
}
