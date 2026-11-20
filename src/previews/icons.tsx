"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, ICON_NAMES, type IconName } from "@registry/icons/icons";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import styles from "./preview.module.css";
import local from "./icons.module.css";

type Pair = { label: string; off: IconName; on: IconName };

const PAIRS: Pair[] = [
  { label: "Show password", off: "eye", on: "eye-off" },
  { label: "Copy", off: "copy", on: "check" },
  { label: "Expand", off: "chevron-down", on: "chevron-up" },
  { label: "Disclose", off: "chevron-right", on: "chevron-down" },
  { label: "Add", off: "plus", on: "close" },
  { label: "Send", off: "send", on: "stop" },
  { label: "Menu", off: "menu", on: "close" },
  { label: "Play", off: "play", on: "pause" },
];

const HOVER: { name: IconName; hint: string }[] = [
  { name: "trash", hint: "lid lifts 1px" },
  { name: "download", hint: "arrow drops 1px" },
  { name: "external", hint: "nudges out 1px" },
  { name: "arrow-right", hint: "nudges forward 1px" },
  { name: "link", hint: "static" },
  { name: "duplicate", hint: "static" },
  { name: "search", hint: "static" },
  { name: "more", hint: "static" },
  { name: "pencil", hint: "static" },
  { name: "sidebar", hint: "static" },
];

function Sequencer() {
  const [current, setCurrent] = useState<IconName>("menu");
  return (
    <div className={local.morph}>
      <div className={local.morphStage}>
        <Icon name={current} className={local.morphBig} />
        <code className={local.iconsProp}>name=&quot;{current}&quot;</code>
      </div>
      <ScrollArea label="Icon names" orientation="horizontal" className={local.morphPads}>
        <SegmentedControl
            size="sm"
          aria-label="Change the large icon to"
          value={current}
          onValueChange={(name) => setCurrent(name as IconName)}
        >
          {ICON_NAMES.filter((name) => name !== "send").map((name) => (
            <Segment key={name} value={name} aria-label={name.replace("-", " ")}>
              <Icon name={name} />
            </Segment>
          ))}
        </SegmentedControl>
      </ScrollArea>
    </div>
  );
}

export function IconsPreview() {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyName(name: IconName) {
    const jsx = `<Icon name="${name}" />`;
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(jsx);
      setStatus(`Copied ${jsx}`);
    } catch {
      setStatus(`Couldn’t copy. Write ${jsx}.`);
    }
    timer.current = window.setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>One icon, any name</h2>
        <p className={styles.note}>
          Pick a name and the large icon becomes it: its ink reshapes into the new icon, with nothing faded out or
          redrawn. Press another mid-way and it heads there from where it is.
        </p>
        <Sequencer />
      </section>

      <section className={styles.group}>
        <h2 className={styles.heading}>State is a name change</h2>
        <p className={styles.note}>
          Only what differs moves. Play and pause have their own move, a quarter turn. Press a tile to flip it;
          press again halfway through and it turns back from where it is.
        </p>
        <div className={local.iconsGrid}>
          {PAIRS.map((pair) => {
            const pressed = Boolean(on[pair.label]);
            return (
              <button
                key={pair.label}
                type="button"
                className={local.iconsTile}
                aria-pressed={pressed}
                onClick={() => setOn((s) => ({ ...s, [pair.label]: !s[pair.label] }))}
              >
                <span className={local.iconsGlyph}>
                  <Icon name={pressed ? pair.on : pair.off} />
                </span>
                <span className={local.iconsName}>{pair.label}</span>
                <code className={local.iconsProp}>
                  {pair.off} ↔ {pair.on}
                </code>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.heading}>Everyday icons</h2>
        <p className={styles.note}>
          A few answer the control they sit in by 1px: hover or tab to a tile. Press one to copy its JSX.
        </p>
        <div className={local.iconsGrid}>
          {HOVER.map((item) => (
            <button
              key={item.name}
              type="button"
              className={local.iconsTile}
              onClick={() => copyName(item.name)}
              aria-label={`Copy <Icon name="${item.name}" />`}
            >
              <span className={local.iconsGlyph}>
                <Icon name={item.name} />
              </span>
              <span className={local.iconsName}>{item.name}</span>
              <span className={local.iconsProp}>{item.hint}</span>
            </button>
          ))}
        </div>
        <p className={local.iconsStatus} role="status">
          {status}
        </p>
      </section>
    </div>
  );
}
