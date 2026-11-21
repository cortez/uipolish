import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

// The drag engine Sortable list and Kanban share: pointer, touch and
// keyboard, written on pointer events with no package.
//
// The page is read from data attributes, so the engine never owns the
// markup: a root holds containers (`data-drag-container="id"`), each holds
// items (`data-drag-key="key"`) in their order, and each item has a
// `data-drag-handle` element (the handle, or the item's own button) that
// takes the keyboard. An item with `data-drag-grab="handle"` lifts only
// from its handle; any other lifts from anywhere that isn't its own control.
//
// While something is held, the item stays in its place, hidden
// (`data-drag-source`), and a copy of it rides above the page, so no
// scrolling column or clipped card can cut it off. The others make room
// with a translate the component's CSS eases on the move spring. On the
// drop the change is handed to the component at once, and once the page
// has it every item glides from where it was seen to where it now is, the
// copy settling onto its new place on the snap spring.

export type DragPlace = { container: string; index: number };
export type DragDrop = { key: string; from: DragPlace; to: DragPlace };

/** What an announcement is about: positions count from 1. */
export type DragEvent = {
  label: string;
  position: number;
  total: number;
  /** The container's name; "" when there's only one. */
  container: string;
  /** The container changed with this move. */
  across: boolean;
};

export type DragMessages = {
  /** Read with every handle: how to move it from the keyboard. */
  instructions: string;
  pickedUp: (e: DragEvent) => string;
  moved: (e: DragEvent) => string;
  dropped: (e: DragEvent) => string;
  cancelled: (e: DragEvent) => string;
};

const where = (e: DragEvent) => (e.container ? `${e.container}, position ${e.position} of ${e.total}` : `position ${e.position} of ${e.total}`);

export const DRAG_MESSAGES: DragMessages = {
  instructions: "Press Space to pick up. Use the arrow keys to move, Space to drop, Escape to cancel.",
  pickedUp: (e) => `Picked up ${e.label}, ${where(e)}.`,
  moved: (e) => (e.across ? `Moved to ${where(e)}.` : `Moved to position ${e.position} of ${e.total}.`),
  dropped: (e) => `Dropped ${e.label} ${e.container ? "in" : "at"} ${where(e)}.`,
  cancelled: (e) => `Cancelled. ${e.label} is back ${e.container ? "in" : "at"} ${where(e)}.`,
};

export type DragOptions = {
  /** A move that changed something; not called when an item lands where it was. */
  onDrop: (drop: DragDrop) => void;
  /** The name an item is announced by. */
  labelOf: (key: string) => string;
  /** The name a container is announced by; "" when there's only one. */
  containerLabelOf?: (id: string) => string;
  messages: DragMessages;
  /** The polite live region the steps are read from. */
  status: RefObject<HTMLElement | null>;
  /** Class of the layer the lifted copy rides in: position fixed, the root's font and color. */
  overlayClass: string;
  /** Enter picks up and drops as well as Space: for a handle that has no other job. */
  enter?: boolean;
  /** Left and Right move between containers. */
  across?: boolean;
};

/** A finger lifts after holding this long, so a swipe still scrolls. */
const HOLD = 250;
/** Moving this far first is a scroll, not a hold. */
const SLOP = 8;
/** A mouse lifts once it has moved this far, so a click stays a click. */
const THRESHOLD = 4;
/** Past the root by more than this, a drop puts the item back. */
const OUTSIDE = 24;
/** Fastest edge scroll, in px per ms (about 20px a frame). */
const SCROLL_SPEED = 1.2;

type Curve = (t: number) => number;

/** A spring token's linear() samples as a function of time. */
function curve(value: string): Curve {
  const body = /linear\(([^)]*)\)/.exec(value)?.[1];
  const points = body?.split(",").map((p) => parseFloat(p)).filter((n) => Number.isFinite(n)) ?? [];
  if (points.length < 2) return (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
  return (t) => {
    if (t <= 0) return points[0];
    if (t >= 1) return points[points.length - 1];
    const x = t * (points.length - 1);
    const i = Math.floor(x);
    return points[i] + (points[i + 1] - points[i]) * (x - i);
  };
}

function ms(value: string, fallback: number) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
}

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

type Point = { x: number; y: number };

type Entry = { key: string; el: HTMLElement; index: number; top: number; left: number; height: number };

type Box = {
  id: string;
  el: HTMLElement;
  /** What the pointer is over to aim at this container: its column, or itself. */
  lane: HTMLElement;
  gap: number;
  padTop: number;
  padLeft: number;
  entries: Entry[];
};

type Lift = {
  layer: HTMLElement;
  clone: HTMLElement;
  /** Where the layer's fixed box really starts: a transformed or contained ancestor moves it. */
  origin: Point;
  /** Its top-left on screen now. */
  at: Point;
  /** The translate last written. */
  applied: Point;
};

type Glide = { from: Point; start: number; duration: number; ease: Curve };

type Session = {
  key: string;
  source: HTMLElement;
  handle: HTMLElement;
  mode: "pointer" | "keyboard";
  pointerId: number;
  from: DragPlace;
  /** Where it would land; null outside the root, which puts it back. */
  to: DragPlace | null;
  boxes: Box[];
  size: { width: number; height: number };
  lift: Lift;
  /** Pointer: the grab point inside the item. */
  grab: Point;
  pointer: Point;
  /** Keyboard: the copy easing toward its slot. */
  glide: Glide | null;
  shifts: Map<HTMLElement, number>;
};

type Pending = {
  key: string;
  item: HTMLElement;
  handle: HTMLElement;
  pointerId: number;
  type: string;
  start: Point;
  timer: number;
  /** Lifts on a hold, not on movement. */
  hold: boolean;
};

type Settle = { key: string; lift: Lift; glide: Glide; done: boolean };

type Commit = { session: Session; seen: Map<HTMLElement, DOMRect>; to: DragPlace };

const CONTROL = "a[href], button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable='false']), [role='button'], [tabindex]";

class Engine {
  root: HTMLElement | null = null;
  options: DragOptions;
  session: Session | null = null;
  pending: Pending | null = null;
  settles: Settle[] = [];
  commit: Commit | null = null;
  frame = 0;
  last = 0;
  said = "";

  constructor(options: DragOptions) {
    this.options = options;
  }

  // ---------- Tokens ----------

  token(name: string) {
    return this.root ? getComputedStyle(this.root).getPropertyValue(name) : "";
  }

  spring(kind: "move" | "snap") {
    if (reduced()) return { duration: 0, ease: () => 1 };
    return {
      duration: ms(this.token(`--ui-dur-${kind}`), kind === "move" ? 380 : 240),
      ease: curve(this.token(`--ui-ease-${kind}`)),
    };
  }

  // ---------- Reading the page ----------

  containers() {
    const root = this.root;
    if (!root) return [];
    const inside = Array.from(root.querySelectorAll<HTMLElement>("[data-drag-container]"));
    return root.hasAttribute("data-drag-container") ? [root, ...inside] : inside;
  }

  itemsOf(container: HTMLElement) {
    return Array.from(container.querySelectorAll<HTMLElement>(":scope > [data-drag-key]"));
  }

  find(key: string) {
    return this.root?.querySelector<HTMLElement>(`[data-drag-key="${CSS.escape(key)}"]`) ?? null;
  }

  handleOf(item: HTMLElement) {
    return item.querySelector<HTMLElement>("[data-drag-handle]") ?? (item.hasAttribute("data-drag-handle") ? item : null);
  }

  measure(): Box[] {
    return this.containers().map((el) => {
      const style = getComputedStyle(el);
      return {
        id: el.dataset.dragContainer ?? "",
        el,
        lane: el.closest<HTMLElement>("[data-drag-lane]") ?? el,
        gap: parseFloat(style.rowGap) || 0,
        padTop: parseFloat(style.paddingTop) || 0,
        padLeft: parseFloat(style.paddingLeft) || 0,
        // offsetTop ignores translate, so this is the layout, wherever the
        // items are seen. The container is their offset parent.
        entries: this.itemsOf(el).map((item, index) => ({
          key: item.dataset.dragKey ?? "",
          el: item,
          index,
          top: item.offsetTop,
          left: item.offsetLeft,
          height: item.offsetHeight,
        })),
      };
    });
  }

  /** The item's place in the layout, on screen, ignoring any translate. */
  layoutRect(item: HTMLElement) {
    const parent = item.offsetParent as HTMLElement | null;
    if (!parent) return item.getBoundingClientRect();
    const r = parent.getBoundingClientRect();
    return new DOMRect(r.left + parent.clientLeft + item.offsetLeft - parent.scrollLeft, r.top + parent.clientTop + item.offsetTop - parent.scrollTop, item.offsetWidth, item.offsetHeight);
  }

  // ---------- Where it would land ----------

  /** Top of the slot at `index` in a box, in the box's own coordinates. */
  slotTop(s: Session, box: Box, index: number) {
    const others = box.entries.filter((e) => e.key !== s.key);
    const source = box.id === s.from.container;
    const removed = s.size.height + box.gap;
    const top = (e: Entry) => e.top - (source && e.index > s.from.index ? removed : 0);
    if (index < others.length) return top(others[index]);
    const tail = others[others.length - 1];
    if (tail) return top(tail) + tail.height + box.gap;
    return source ? (box.entries[0]?.top ?? box.padTop) : box.padTop;
  }

  slotLeft(s: Session, box: Box) {
    const own = box.entries.find((e) => e.key === s.key) ?? box.entries[0];
    return own ? own.left : box.padLeft;
  }

  /** The slot `to` on screen. */
  slotPoint(s: Session, to: DragPlace): Point {
    const box = s.boxes.find((b) => b.id === to.container)!;
    const r = box.el.getBoundingClientRect();
    return { x: r.left + box.el.clientLeft + this.slotLeft(s, box), y: r.top + box.el.clientTop + this.slotTop(s, box, to.index) };
  }

  countIn(s: Session, id: string) {
    const box = s.boxes.find((b) => b.id === id);
    if (!box) return 0;
    return box.entries.filter((e) => e.key !== s.key).length + 1;
  }

  /** The nearest slot to the lifted copy, or null when the pointer has left. */
  aim(s: Session): DragPlace | null {
    const root = this.root!.getBoundingClientRect();
    const p = s.pointer;
    if (p.x < root.left - OUTSIDE || p.x > root.right + OUTSIDE || p.y < root.top - OUTSIDE || p.y > root.bottom + OUTSIDE) return null;
    let best: Box | null = null;
    let distance = Infinity;
    for (const box of s.boxes) {
      const lane = box.lane.getBoundingClientRect();
      const d = p.x < lane.left ? lane.left - p.x : p.x > lane.right ? p.x - lane.right : 0;
      if (d < distance) {
        distance = d;
        best = box;
      }
    }
    if (!best) return null;
    const r = best.el.getBoundingClientRect();
    const middle = s.lift.at.y + s.size.height / 2 - (r.top + best.el.clientTop);
    const slots = best.entries.filter((e) => e.key !== s.key).length + 1;
    let index = 0;
    let gap = Infinity;
    for (let i = 0; i < slots; i++) {
      const d = Math.abs(this.slotTop(s, best, i) + s.size.height / 2 - middle);
      if (d < gap) {
        gap = d;
        index = i;
      }
    }
    return { container: best.id, index };
  }

  /** Opens the gap at `to` and closes the one the item left. */
  shift(s: Session) {
    const to = s.to ?? s.from;
    for (const box of s.boxes) {
      box.el.toggleAttribute("data-drag-over", s.to !== null && box.id === to.container);
      let j = 0;
      for (const e of box.entries) {
        if (e.key === s.key) continue;
        let by = 0;
        if (box.id === s.from.container && e.index > s.from.index) by -= s.size.height + box.gap;
        if (box.id === to.container && j >= to.index) by += s.size.height + box.gap;
        j++;
        // A copy still settling holds its item's place: it stays put.
        if (e.el.hasAttribute("data-drag-source")) by = 0;
        if (s.shifts.get(e.el) === by) continue;
        s.shifts.set(e.el, by);
        e.el.style.translate = by ? `0 ${by}px` : "";
      }
    }
  }

  // ---------- The lifted copy ----------

  lift(item: HTMLElement, at: Point, grab: Point | null, keyboard: boolean): Lift {
    const layer = document.createElement("div");
    layer.className = this.options.overlayClass;
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    layer.dir = getComputedStyle(item).direction;
    layer.style.width = `${item.offsetWidth}px`;
    if (keyboard) layer.dataset.keyboard = "";
    const clone = item.cloneNode(true) as HTMLElement;
    for (const el of [clone, ...clone.querySelectorAll<HTMLElement>("[id]")]) el.removeAttribute("id");
    for (const name of ["data-drag-key", "data-drag-source", "data-drag-pending"]) clone.removeAttribute(name);
    clone.style.translate = "";
    clone.style.transition = "";
    clone.style.transformOrigin = "";
    clone.setAttribute("data-drag-clone", "");
    // A copy starts where the hold cue had got to, so nothing steps.
    const cue = getComputedStyle(item, "::after").opacity;
    const scale = getComputedStyle(item).scale;
    clone.style.setProperty("--drag-from", scale && scale !== "none" ? scale : "1");
    clone.style.setProperty("--drag-cue", cue && item.hasAttribute("data-drag-pending") ? cue : "0");
    // It grows by about 12px across, at most 2%: a wide row at 2% would
    // stretch by tens of pixels.
    clone.style.setProperty("--drag-scale", String(1 + Math.min(0.02, 12 / Math.max(1, item.offsetWidth))));
    // It grows about the grab point, so what's under the finger stays there.
    clone.style.transformOrigin = grab ? `${grab.x}px ${grab.y}px` : "50% 50%";
    layer.append(clone);
    const host = item.closest<HTMLElement>("[data-theme]:not(html)") ?? document.body;
    host.append(layer);
    const r = layer.getBoundingClientRect();
    const lift = { layer, clone, origin: { x: r.left, y: r.top }, at, applied: { x: 0, y: 0 } };
    this.place(lift, at);
    return lift;
  }

  place(lift: Lift, at: Point) {
    lift.at = at;
    lift.applied = { x: at.x - lift.origin.x, y: at.y - lift.origin.y };
    lift.layer.style.transform = `translate3d(${lift.applied.x}px, ${lift.applied.y}px, 0)`;
  }

  /** Re-reads where the fixed layer starts, in case an ancestor moved it. */
  reorigin(lift: Lift) {
    const r = lift.layer.getBoundingClientRect();
    lift.origin = { x: r.left - lift.applied.x, y: r.top - lift.applied.y };
  }

  // ---------- Starting ----------

  pointerDown = (event: PointerEvent) => {
    if (this.session || this.pending || !this.root) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as Element | null;
    if (!target) return;

    // A copy still settling can be caught again, from where it's seen.
    for (const settle of this.settles) {
      const r = settle.lift.layer.getBoundingClientRect();
      if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) {
        const item = this.find(settle.key);
        const handle = item && this.handleOf(item);
        if (!item || !handle) return;
        this.arm(event, item, handle, item.dataset.dragGrab !== "handle");
        return;
      }
    }

    const item = target.closest<HTMLElement>("[data-drag-key]");
    if (!item || !this.root.contains(item) || item.hasAttribute("data-drag-disabled")) return;
    const handle = this.handleOf(item);
    if (!handle) return;
    if (item.dataset.dragGrab === "handle") {
      if (!target.closest("[data-drag-handle]")) return;
    } else {
      // The item's own controls keep their press.
      const control = target.closest(CONTROL);
      if (control && control !== handle && item.contains(control) && control !== item) return;
    }
    this.arm(event, item, handle, item.dataset.dragGrab !== "handle");
  };

  arm(event: PointerEvent, item: HTMLElement, handle: HTMLElement, wholeItem: boolean) {
    const hold = event.pointerType === "touch" && wholeItem;
    const pending: Pending = {
      key: item.dataset.dragKey ?? "",
      item,
      handle,
      pointerId: event.pointerId,
      type: event.pointerType,
      start: { x: event.clientX, y: event.clientY },
      timer: 0,
      hold,
    };
    this.pending = pending;
    // A press goes down about the point pressed, and the lift grows from there.
    const r = item.getBoundingClientRect();
    item.style.transformOrigin = `${event.clientX - r.left}px ${event.clientY - r.top}px`;
    if (hold) {
      item.setAttribute("data-drag-pending", "");
      pending.timer = window.setTimeout(() => this.activate(pending.start), HOLD);
    }
    window.addEventListener("pointermove", this.pointerMove, { passive: true });
    window.addEventListener("pointerup", this.pointerUp, true);
    window.addEventListener("pointercancel", this.pointerCancel, true);
    window.addEventListener("touchmove", this.touchMove, { passive: false });
    item.addEventListener("contextmenu", this.contextMenu);
  }

  disarm() {
    const p = this.pending;
    if (!p) return;
    window.clearTimeout(p.timer);
    p.item.removeAttribute("data-drag-pending");
    this.pending = null;
  }

  unlisten() {
    window.removeEventListener("pointermove", this.pointerMove);
    window.removeEventListener("pointerup", this.pointerUp, true);
    window.removeEventListener("pointercancel", this.pointerCancel, true);
    window.removeEventListener("touchmove", this.touchMove);
    window.removeEventListener("keydown", this.windowKey, true);
    for (const item of this.root?.querySelectorAll("[data-drag-key]") ?? []) item.removeEventListener("contextmenu", this.contextMenu);
  }

  contextMenu = (event: Event) => {
    // A long press would open the system menu over the card being lifted.
    if (this.pending?.hold || this.session) event.preventDefault();
  };

  touchMove = (event: TouchEvent) => {
    // Once lifted, the finger drags the item, not the page.
    if (this.session?.mode === "pointer" && event.cancelable) event.preventDefault();
  };

  pointerMove = (event: PointerEvent) => {
    const p = this.pending;
    if (p && event.pointerId === p.pointerId) {
      const d = Math.hypot(event.clientX - p.start.x, event.clientY - p.start.y);
      if (p.hold) {
        if (d > SLOP) {
          this.disarm();
          this.unlisten();
        }
      } else if (d > THRESHOLD) {
        this.activate(p.start, { x: event.clientX, y: event.clientY });
      }
      return;
    }
    const s = this.session;
    if (!s || s.mode !== "pointer" || event.pointerId !== s.pointerId) return;
    s.pointer = { x: event.clientX, y: event.clientY };
    this.place(s.lift, { x: s.pointer.x - s.grab.x, y: s.pointer.y - s.grab.y });
  };

  pointerUp = (event: PointerEvent) => {
    if (this.pending && event.pointerId === this.pending.pointerId) {
      this.disarm();
      this.unlisten();
      return;
    }
    const s = this.session;
    if (!s || s.mode !== "pointer" || event.pointerId !== s.pointerId) return;
    // The press that ends a drag isn't a click on whatever is under it.
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, true), 0);
    this.drop(false);
  };

  pointerCancel = (event: PointerEvent) => {
    if (this.pending && event.pointerId === this.pending.pointerId) {
      this.disarm();
      this.unlisten();
      return;
    }
    if (this.session?.mode === "pointer" && event.pointerId === this.session.pointerId) this.drop(true);
  };

  windowKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.session?.mode === "pointer") {
      event.preventDefault();
      event.stopPropagation();
      this.drop(true);
    }
  };

  /** Lifts the pending item; `now` is where the pointer is, if it moved. */
  activate(start: Point, now?: Point) {
    const p = this.pending;
    if (!p) return;
    window.clearTimeout(p.timer);
    this.pending = null;
    const caught = this.settles.find((x) => x.key === p.key);
    this.begin(p.item, p.handle, "pointer", p.pointerId, start, caught);
    p.item.removeAttribute("data-drag-pending");
    window.addEventListener("keydown", this.windowKey, true);
    if (now && this.session) {
      this.session.pointer = now;
      this.place(this.session.lift, { x: now.x - this.session.grab.x, y: now.y - this.session.grab.y });
    }
  }

  begin(item: HTMLElement, handle: HTMLElement, mode: Session["mode"], pointerId: number, pointer: Point, caught?: Settle) {
    const root = this.root!;
    const boxes = this.measure();
    const key = item.dataset.dragKey ?? "";
    const box = boxes.find((b) => b.entries.some((e) => e.key === key));
    if (!box) return;
    const from = { container: box.id, index: box.entries.findIndex((e) => e.key === key) };

    let lift: Lift;
    let grab: Point;
    if (caught) {
      // Taken over mid-settle: the same copy, from where it is.
      this.settles = this.settles.filter((x) => x !== caught);
      lift = caught.lift;
      delete lift.clone.dataset.settling;
      lift.layer.toggleAttribute("data-keyboard", mode === "keyboard");
      grab = { x: pointer.x - lift.at.x, y: pointer.y - lift.at.y };
      lift.clone.style.transformOrigin = `${grab.x}px ${grab.y}px`;
    } else {
      const r = this.layoutRect(item);
      grab = { x: pointer.x - r.left, y: pointer.y - r.top };
      lift = this.lift(item, { x: r.left, y: r.top }, mode === "pointer" ? grab : null, mode === "keyboard");
    }
    item.setAttribute("data-drag-source", "");
    // Items still gliding home from the last drop carry on from where
    // they're seen: the glide becomes a translate the next shift eases from.
    for (const b of boxes) {
      for (const e of b.entries) {
        const running = e.el.getAnimations();
        if (!running.length) continue;
        const seen = e.el.getBoundingClientRect();
        running.forEach((a) => a.cancel());
        const rest = e.el.getBoundingClientRect();
        e.el.style.transition = "none";
        e.el.style.translate = `${seen.left - rest.left}px ${seen.top - rest.top}px`;
        e.el.getBoundingClientRect();
        e.el.style.transition = "";
      }
    }

    this.session = {
      key,
      source: item,
      handle,
      mode,
      pointerId,
      from,
      to: from,
      boxes,
      size: { width: item.offsetWidth, height: item.offsetHeight },
      lift,
      grab,
      pointer,
      glide: null,
      shifts: new Map(),
    };
    root.setAttribute("data-dragging", mode);
    if (mode === "pointer") document.documentElement.style.cursor = "grabbing";
    this.shift(this.session);
    if (caught && mode === "keyboard") this.retarget(this.session);
    this.say("pickedUp", from, false);
    this.loop();
  }

  // ---------- Keyboard ----------

  keyDown = (event: KeyboardEvent) => {
    if (!this.root || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const s = this.session;
    const handle = (event.target as Element | null)?.closest<HTMLElement>("[data-drag-handle]");
    const pick = event.key === " " || (this.options.enter && event.key === "Enter");

    if (!s) {
      if (!pick || !handle || this.pending) return;
      const item = handle.closest<HTMLElement>("[data-drag-key]");
      if (!item || item.hasAttribute("data-drag-disabled") || !this.root.contains(item)) return;
      event.preventDefault();
      if (event.repeat) return;
      const settling = this.settles.find((x) => x.key === item.dataset.dragKey);
      const r = this.layoutRect(item);
      this.begin(item, handle, "keyboard", -1, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, settling);
      return;
    }
    if (s.mode !== "keyboard") return;

    // Held, Enter drops too: it never reaches the card's own button.
    if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      if (!event.repeat) this.drop(event.key === "Escape");
      return;
    }
    if (event.key === "Tab") {
      // Leaving mid-move would strand the lifted item; it lands first.
      this.drop(false);
      return;
    }
    const to = s.to ?? s.from;
    const index = s.boxes.findIndex((b) => b.id === to.container);
    const count = this.countIn(s, to.container);
    const rtl = getComputedStyle(s.source).direction === "rtl";
    let next: DragPlace | null = null;
    if (event.key === "ArrowUp") next = { container: to.container, index: Math.max(0, to.index - 1) };
    else if (event.key === "ArrowDown") next = { container: to.container, index: Math.min(count - 1, to.index + 1) };
    else if (event.key === "Home") next = { container: to.container, index: 0 };
    else if (event.key === "End") next = { container: to.container, index: count - 1 };
    else if (this.options.across && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
      const box = s.boxes[index + step];
      if (box) {
        const total = this.countIn(s, box.id);
        next = { container: box.id, index: Math.min(to.index, total - 1) };
      } else next = to;
    }
    if (!next) return;
    event.preventDefault();
    if (next.container === to.container && next.index === to.index) return;
    const across = next.container !== to.container;
    s.to = next;
    this.shift(s);
    this.retarget(s);
    this.reveal(s, next);
    this.say("moved", next, across);
  };

  keyUp = (event: KeyboardEvent) => {
    // A button clicks on Space's release: picking up or dropping isn't a click.
    if (event.key === " " && (event.target as Element | null)?.closest("[data-drag-handle]")) event.preventDefault();
  };

  focusOut = (event: FocusEvent) => {
    const s = this.session;
    if (s?.mode !== "keyboard" || event.target !== s.handle) return;
    // The page took focus (a click elsewhere): put the item back.
    if (s.handle.isConnected) this.drop(true);
  };

  retarget(s: Session) {
    const { duration, ease } = this.spring("move");
    const slot = this.slotPoint(s, s.to ?? s.from);
    s.glide = { from: { x: s.lift.at.x - slot.x, y: s.lift.at.y - slot.y }, start: performance.now(), duration, ease };
    // With no glide, it lands in this frame, with the others.
    if (!duration) this.place(s.lift, slot);
  }

  /** Scrolls the slot into view in each scroller around it, innermost first. */
  reveal(s: Session, to: DragPlace) {
    const box = s.boxes.find((b) => b.id === to.container);
    if (!box) return;
    const slot = this.slotPoint(s, to);
    const behavior: ScrollBehavior = reduced() ? "instant" : "smooth";
    const margin = 16;
    for (const el of scrollers(box.el)) {
      const r = viewRect(el);
      const top = slot.y - margin;
      const bottom = slot.y + s.size.height + margin;
      const left = slot.x - margin;
      const right = slot.x + s.size.width + margin;
      const dy = top < r.top ? top - r.top : bottom > r.bottom ? Math.min(bottom - r.bottom, top - r.top) : 0;
      const dx = left < r.left ? left - r.left : right > r.right ? Math.min(right - r.right, left - r.left) : 0;
      if (dx || dy) el.scrollBy({ left: dx, top: dy, behavior });
    }
  }

  // ---------- Each frame ----------

  loop() {
    if (this.frame) return;
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - this.last);
      this.last = now;
      const s = this.session;
      if (s) {
        this.reorigin(s.lift);
        if (s.mode === "pointer") {
          this.autoscroll(s, dt);
          const to = this.aim(s);
          const same = to === s.to || (to && s.to && to.container === s.to.container && to.index === s.to.index);
          if (!same) {
            s.to = to;
            this.shift(s);
          }
          this.place(s.lift, { x: s.pointer.x - s.grab.x, y: s.pointer.y - s.grab.y });
        } else {
          const slot = this.slotPoint(s, s.to ?? s.from);
          const g = s.glide;
          const k = g && g.duration ? 1 - g.ease((now - g.start) / g.duration) : 0;
          this.place(s.lift, g ? { x: slot.x + g.from.x * k, y: slot.y + g.from.y * k } : slot);
        }
      }
      for (const settle of this.settles) this.settleFrame(settle, now);
      this.settles = this.settles.filter((x) => !x.done);
      if (this.session || this.settles.length) this.frame = requestAnimationFrame(tick);
      else this.frame = 0;
    };
    this.frame = requestAnimationFrame(tick);
  }

  autoscroll(s: Session, dt: number) {
    const target = s.boxes.find((b) => b.id === (s.to ?? s.from).container)?.el ?? s.source;
    const p = s.pointer;
    const list = scrollers(target);
    for (const axis of ["y", "x"] as const) {
      for (const el of list) {
        const r = viewRect(el);
        const [lo, hi, pos, across, acrossLo, acrossHi] =
          axis === "y" ? [r.top, r.bottom, p.y, p.x, r.left, r.right] : [r.left, r.right, p.x, p.y, r.top, r.bottom];
        if (across < acrossLo || across > acrossHi) continue;
        const zone = Math.min(64, Math.max(24, (hi - lo) / 5));
        let v = 0;
        if (pos < lo + zone) v = -Math.min(1, (lo + zone - pos) / zone);
        else if (pos > hi - zone) v = Math.min(1, (pos - (hi - zone)) / zone);
        if (!v || !canScroll(el, axis, v)) continue;
        const by = Math.sign(v) * v * v * SCROLL_SPEED * dt;
        if (axis === "y") el.scrollTop += by;
        else el.scrollLeft += by;
        break;
      }
    }
  }

  // ---------- Dropping ----------

  drop(cancel: boolean) {
    const s = this.session;
    if (!s || !this.root) return;
    this.session = null;
    this.unlisten();
    document.documentElement.style.cursor = "";
    const to = cancel || !s.to ? s.from : s.to;
    // Where every item is seen now, before the page changes under them.
    const seen = new Map<HTMLElement, DOMRect>();
    for (const box of s.boxes) for (const e of box.entries) if (e.el !== s.source) seen.set(e.el, e.el.getBoundingClientRect());
    for (const box of s.boxes) box.el.removeAttribute("data-drag-over");
    this.root.removeAttribute("data-dragging");
    this.commit = { session: s, seen, to };

    const moved = to.container !== s.from.container || to.index !== s.from.index;
    this.say(moved ? "dropped" : cancel || s.to === null ? "cancelled" : "dropped", to, false);
    if (moved) this.options.onDrop({ key: s.key, from: s.from, to });
    // The page has its new order by the next frame, or never: settle then
    // either way. A component that re-renders sooner settles in its layout effect.
    requestAnimationFrame(() => this.settle());
  }

  /** Runs once the page shows the drop: everything glides from where it was seen. */
  settle() {
    const c = this.commit;
    if (!c) return;
    this.commit = null;
    const s = c.session;
    const { duration } = this.spring("move");
    const moveEase = this.token("--ui-ease-move") || "ease-out";
    for (const [el, was] of c.seen) {
      if (!el.isConnected) continue;
      el.style.transition = "none";
      el.style.translate = "";
      const now = el.getBoundingClientRect();
      el.style.transition = "";
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (duration && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        el.animate({ translate: [`${dx}px ${dy}px`, "0px 0px"] }, { duration, easing: moveEase });
      }
    }
    // Moved to another container, the item is a new element: find it by key.
    const source = this.find(s.key) ?? s.source;
    source.setAttribute("data-drag-source", "");
    if (s.mode === "keyboard" && !this.root?.contains(document.activeElement)) {
      this.handleOf(source)?.focus({ preventScroll: true });
    }
    const snap = this.spring("snap");
    const landing = source.getBoundingClientRect();
    s.lift.clone.dataset.settling = "";
    const settle: Settle = {
      key: s.key,
      lift: s.lift,
      glide: { from: { x: s.lift.at.x - landing.left, y: s.lift.at.y - landing.top }, start: performance.now(), duration: snap.duration, ease: snap.ease },
      done: false,
    };
    this.settles.push(settle);
    this.settleFrame(settle, performance.now());
    if (settle.done) this.settles = this.settles.filter((x) => x !== settle);
    else this.loop();
  }

  settleFrame(settle: Settle, now: number) {
    const source = this.find(settle.key);
    if (!source) {
      this.finishSettle(settle);
      return;
    }
    const g = settle.glide;
    const t = g.duration ? (now - g.start) / g.duration : 1;
    // Anchored to the item, so a scroll mid-settle carries it along.
    const r = source.getBoundingClientRect();
    this.reorigin(settle.lift);
    if (t >= 1) {
      this.place(settle.lift, { x: r.left, y: r.top });
      this.finishSettle(settle);
      return;
    }
    const k = 1 - g.ease(t);
    this.place(settle.lift, { x: r.left + g.from.x * k, y: r.top + g.from.y * k });
  }

  finishSettle(settle: Settle) {
    settle.done = true;
    settle.lift.layer.remove();
    this.settles = this.settles.filter((x) => x !== settle);
    // In the same frame the copy goes, the item shows: one is the other.
    const source = this.find(settle.key);
    if (source && this.session?.key !== settle.key) source.removeAttribute("data-drag-source");
  }

  // ---------- Announcing ----------

  say(kind: "pickedUp" | "moved" | "dropped" | "cancelled", place: DragPlace, across: boolean) {
    const s = this.session ?? this.commit?.session;
    const status = this.options.status.current;
    if (!s || !status) return;
    const label = this.options.labelOf(s.key);
    const total = this.countIn(s, place.container);
    const container = this.options.containerLabelOf?.(place.container) ?? "";
    let text = this.options.messages[kind]({ label, position: place.index + 1, total, container, across });
    // The same words twice are only read again if the text changes.
    if (text === this.said) text += " ";
    this.said = text;
    status.textContent = text;
  }

  // ---------- Life ----------

  attach(root: HTMLElement) {
    this.root = root;
    root.addEventListener("pointerdown", this.pointerDown);
    root.addEventListener("keydown", this.keyDown);
    root.addEventListener("keyup", this.keyUp);
    root.addEventListener("focusout", this.focusOut);
    root.addEventListener("dragstart", preventDefault);
  }

  detach() {
    const root = this.root;
    if (!root) return;
    root.removeEventListener("pointerdown", this.pointerDown);
    root.removeEventListener("keydown", this.keyDown);
    root.removeEventListener("keyup", this.keyUp);
    root.removeEventListener("focusout", this.focusOut);
    root.removeEventListener("dragstart", preventDefault);
    this.disarm();
    this.unlisten();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.session?.lift.layer.remove();
    for (const settle of this.settles) settle.lift.layer.remove();
    this.session = null;
    this.settles = [];
    this.commit = null;
    document.documentElement.style.cursor = "";
    this.root = null;
  }
}

function preventDefault(event: Event) {
  event.preventDefault();
}

/** Every element that scrolls around `el`, innermost first, ending with the page. */
function scrollers(el: HTMLElement) {
  const out: HTMLElement[] = [];
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break;
    const style = getComputedStyle(node);
    const y = /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    const x = /(auto|scroll|overlay)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
    if (x || y) out.push(node);
  }
  const page = document.scrollingElement as HTMLElement | null;
  if (page) out.push(page);
  return out;
}

/** The part of a scroller on screen. */
function viewRect(el: HTMLElement) {
  if (el === document.scrollingElement) return { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth };
  const r = el.getBoundingClientRect();
  return { top: Math.max(0, r.top), left: Math.max(0, r.left), bottom: Math.min(window.innerHeight, r.bottom), right: Math.min(window.innerWidth, r.right) };
}

function canScroll(el: HTMLElement, axis: "x" | "y", direction: number) {
  if (axis === "y") return direction < 0 ? el.scrollTop > 0 : el.scrollTop < el.scrollHeight - el.clientHeight - 1;
  // Right to left, scrollLeft runs from 0 down to minus the overflow.
  const max = el.scrollWidth - el.clientWidth;
  const rtl = getComputedStyle(el).direction === "rtl";
  const pos = rtl ? -el.scrollLeft : el.scrollLeft;
  const forward = rtl ? direction < 0 : direction > 0;
  return forward ? pos < max - 1 : pos > 0;
}

/**
 * Wires the drag engine to `root`. Call it on every render: the options
 * are read fresh each time, and a drop settles as soon as the page shows it.
 */
export function useDragSort(root: RefObject<HTMLElement | null>, options: DragOptions) {
  const engine = useRef<Engine | null>(null);

  // Before anything can be pressed, and again after every render: the
  // options are read fresh, and a drop settles in the render that shows it,
  // before paint, so nothing is ever drawn in two places.
  useLayoutEffect(() => {
    engine.current ??= new Engine(options);
    engine.current.options = options;
    engine.current.settle();
  });

  useEffect(() => {
    const el = root.current;
    const e = engine.current;
    if (!el || !e) return;
    e.attach(el);
    return () => e.detach();
  }, [root]);
}
