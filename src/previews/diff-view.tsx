"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { DiffView } from "@registry/diff-view/diff-view";
import base from "./preview.module.css";
import styles from "./diff-view.module.css";

const BEFORE = `import { Money } from "./money";

export type Zone = "local" | "regional" | "national";

// Flat rates per zone, in cents.
const RATES: Record<Zone, number> = {
  local: 499,
  regional: 899,
  national: 1299,
};

const FREE_SHIPPING_OVER = 5000;

export function zoneFor(postalCode: string): Zone {
  if (postalCode.startsWith("97")) return "local";
  if (postalCode.startsWith("98")) return "regional";
  return "national";
}

export function isRemote(postalCode: string) {
  return postalCode.startsWith("995");
}

export function packageCount(items: number) {
  return Math.ceil(items / 6);
}

export function estimateDays(zone: Zone) {
  return zone === "local" ? 1 : zone === "regional" ? 3 : 5;
}

export function shippingFor(subtotal: number, postalCode: string): Money {
  if (subtotal > FREE_SHIPPING_OVER) return Money.zero();
  const zone = zoneFor(postalCode);
  return Money.cents(RATES[zone]);
}
`;

const AFTER = `import { Money } from "./money";

export type Zone = "local" | "regional" | "national";

// Flat rates per zone, in cents.
const RATES: Record<Zone, number> = {
  local: 499,
  regional: 999,
  national: 1499,
};

const FREE_SHIPPING_OVER = 7500;

export function zoneFor(postalCode: string): Zone {
  if (postalCode.startsWith("97")) return "local";
  if (postalCode.startsWith("98")) return "regional";
  return "national";
}

export function isRemote(postalCode: string) {
  return postalCode.startsWith("995");
}

export function packageCount(items: number) {
  return Math.ceil(items / 6);
}

export function estimateDays(zone: Zone) {
  return zone === "local" ? 1 : zone === "regional" ? 3 : 5;
}

export function shippingFor(subtotal: number, postalCode: string): Money {
  // Orders at the threshold ship free too.
  if (subtotal >= FREE_SHIPPING_OVER) return Money.zero();
  const zone = zoneFor(postalCode);
  const surcharge = isRemote(postalCode) ? 1000 : 0;
  return Money.cents(RATES[zone] + surcharge);
}
`;

/** Characters per tick and ticks per second, roughly how fast a model writes. */
const CHUNK = 14;
const TICK = 40;

export function DiffViewPreview() {
  const [length, setLength] = useState(AFTER.length);
  const timer = useRef(0);
  const streaming = length < AFTER.length;

  useEffect(() => () => clearInterval(timer.current), []);

  function play() {
    clearInterval(timer.current);
    setLength(0);
    timer.current = window.setInterval(() => {
      setLength((n) => {
        const next = Math.min(AFTER.length, n + CHUNK);
        if (next === AFTER.length) clearInterval(timer.current);
        return next;
      });
    }, TICK);
  }

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>An edit to review</h2>
        <DiffView name="checkout/shipping.ts" before={BEFORE} after={AFTER} />
      </section>

      <section className={base.group}>
        <h2 className={base.heading}>While it’s being written</h2>
        <div className={base.row}>
          <Button variant="secondary" onClick={play} busy={streaming}>
            Write the edit again
          </Button>
        </div>
        {/* The finished diff holds the space from the start; the live one is
            drawn over it and never resizes the page while it streams. */}
        <div className={styles.reserve}>
          <div className={styles.ghost} aria-hidden="true" inert>
            <DiffView name="checkout/shipping.ts" before={BEFORE} after={AFTER} />
          </div>
          <div className={styles.live} data-streaming={streaming || undefined}>
            <DiffView name="checkout/shipping.ts" before={BEFORE} after={AFTER.slice(0, length)} streaming={streaming} />
          </div>
        </div>
      </section>
    </div>
  );
}
