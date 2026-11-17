"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Badge } from "@registry/badge/badge";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { CodeBlock } from "@registry/code-block/code-block";
import { Progress } from "@registry/progress/progress";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { Slider } from "@registry/slider/slider";
import { Switch } from "@registry/switch/switch";
import { TextField } from "@registry/text-field/text-field";
import { THEME_PRESETS, createTheme } from "@/lib/theme";
import styles from "./theme-builder.module.css";

/** Pick one hue; see the components in it, light and dark; copy the CSS. */
export function ThemeBuilder() {
  const [hue, setHue] = useState(262);
  const [tint, setTint] = useState<"0" | "1" | "2">("1");
  const [brand, setBrand] = useState(true);
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const theme = useMemo(() => createTheme({ hue, tint: Number(tint) as 0 | 1 | 2, brand }), [hue, tint, brand]);

  return (
    <div className={styles.builder}>
      <div className={styles.controls}>
        <div className={styles.swatches} role="group" aria-label="Starting colors">
          {THEME_PRESETS.map((p) => {
            const swatch = createTheme({ hue: p.hue }).vars["--ui-accent"];
            return (
              <button
                key={p.name}
                type="button"
                className={styles.swatch}
                aria-pressed={Math.round(hue) === p.hue}
                aria-label={p.name}
                title={p.name}
                style={{ "--swatch": swatch } as CSSProperties}
                onClick={() => setHue(p.hue)}
              />
            );
          })}
        </div>
        <Slider label="Hue" min={0} max={359} value={hue} onValueChange={setHue} format={(v) => `${v}°`} morph={false} />
        <div className={styles.row}>
          <span className={styles.label} id="theme-grays">
            Grays
          </span>
          <SegmentedControl aria-labelledby="theme-grays" value={tint} onValueChange={(v) => setTint(v as "0" | "1" | "2")}>
            <Segment value="0">Neutral</Segment>
            <Segment value="1">A hint</Segment>
            <Segment value="2">Tinted</Segment>
          </SegmentedControl>
        </div>
        <Switch label="Primary buttons in the color" checked={brand} onChange={(e) => setBrand(e.currentTarget.checked)} side="end" />
      </div>

      <div className={styles.previewHead}>
        <span className={styles.label}>Preview</span>
        <SegmentedControl aria-label="Preview theme" value={scheme} onValueChange={(v) => setScheme(v as "light" | "dark")}>
          <Segment value="light">Light</Segment>
          <Segment value="dark">Dark</Segment>
        </SegmentedControl>
      </div>
      <div className={styles.preview} data-theme={scheme} style={theme.vars as CSSProperties}>
        <div className={styles.previewRow}>
          <Button>Save changes</Button>
          <Button variant="secondary">Cancel</Button>
          <Badge tone="accent">New</Badge>
        </div>
        <TextField label="Supper name" defaultValue="Saturday supper" hint="Guests see this on the invitation." />
        <div className={styles.previewRow}>
          <Checkbox label="Send reminders" defaultChecked />
          <Switch label="Open the waitlist" defaultChecked />
        </div>
        <Progress label="Seats filled" value={9} max={12} valueText="9 of 12" />
        <p className={styles.link}>
          Replies go to <a href="#theme-css">hosts@saturdaysupper.example.com</a>.
        </p>
      </div>

      <ul className={styles.checks} aria-label="Contrast">
        {theme.checks.map((c) => (
          <li key={c.role}>
            <span>{c.role}</span>
            <span className={styles.ratio}>
              {c.ratio.toFixed(2)}:1 <span className={styles.needed}>needs {c.needed}</span>
            </span>
          </li>
        ))}
      </ul>

      <div id="theme-css">
        <CodeBlock code={theme.css} language="css" title="theme.css" />
      </div>
    </div>
  );
}
