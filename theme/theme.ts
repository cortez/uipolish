// One color in, a whole --ui-* palette out: the accent (fill, text, the text
// on it), optionally tinted neutrals, and optionally the primary buttons in
// the accent too, in light and dark. Every text role is solved for WCAG
// contrast (4.5:1 for text, 3:1 for fills and icons) instead of guessed, so
// any hue gives a theme that still reads.
//
// Pure math, no DOM: the theme page, the REST API and the MCP tool share it.

export type ThemeOptions = {
  /** OKLCH hue, 0–360. */
  hue: number;
  /** How much of the hue the grays take: none, a hint, or a clear tint. */
  tint?: 0 | 1 | 2;
  /** The primary buttons (--ui-ink) in the accent instead of near-black. */
  brand?: boolean;
};

type Oklch = { l: number; c: number; h: number };

const NEUTRAL_HUE_CHROMA = [0, 0.006, 0.014] as const;

// The neutral ladder's lightness, light then dark, matching tokens.css.
const NEUTRALS = {
  canvas: [0.99, 0.145],
  surface: [1, 0.19],
  foreground: [0.21, 0.93],
  muted: [0.5, 0.71],
  subtle: [0.55, 0.62],
} as const;

// Every edge is one solid neutral, light then dark: outlines and dividers
// alike (tokens.css keeps three names for the one value). Solid, so a line
// reads the same over the page, a card or a field.
const EDGE: [number, number] = [0.954, 0.26];
const EDGES = ["border-subtle", "border", "border-strong"] as const;

function toLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function inGamut(color: Oklch) {
  return toLinearRgb(color).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
}

/** The same lightness and hue, with chroma pulled in until sRGB can show it. */
function fit(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

function luminance(color: Oklch) {
  const [r, g, b] = toLinearRgb(fit(color)).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(y1: number, y2: number) {
  return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
}

/**
 * The lightness closest to `from` (searching toward `toward`) whose contrast
 * against every background luminance is at least `ratio`.
 */
function solve(h: number, c: number, from: number, toward: 0 | 1, against: number[], ratio: number) {
  const ok = (l: number) => against.every((y) => contrast(luminance({ l, c, h }), y) >= ratio);
  if (ok(from)) return from;
  let bad = from;
  let good: number = toward;
  for (let i = 0; i < 30; i++) {
    const mid = (bad + good) / 2;
    if (ok(mid)) good = mid;
    else bad = mid;
  }
  return good;
}

const round = (n: number, d = 3) => Number(n.toFixed(d));
const css = ({ l, c, h }: Oklch) => `oklch(${round(l)} ${round(c)} ${round(h, 1)})`;
const pair = (light: Oklch, dark: Oklch) => `light-dark(${css(fit(light))}, ${css(fit(dark))})`;

export type Theme = {
  /** Each --ui-* role, as its CSS value (light-dark() where the themes differ). */
  vars: Record<string, string>;
  /** Ready to paste: a :root block. */
  css: string;
  /** The ratios that were solved for, so they can be shown. */
  checks: { role: string; ratio: number; needed: number }[];
};

export function createTheme({ hue, tint = 0, brand = false }: ThemeOptions): Theme {
  const h = ((hue % 360) + 360) % 360;
  const nc = NEUTRAL_HUE_CHROMA[tint];
  const vars: Record<string, string> = {};
  const checks: Theme["checks"] = [];

  const neutral = (name: keyof typeof NEUTRALS, side: 0 | 1) => ({ l: NEUTRALS[name][side], c: nc, h });
  for (const name of Object.keys(NEUTRALS) as (keyof typeof NEUTRALS)[]) {
    if (tint > 0) vars[`--ui-${name}`] = pair(neutral(name, 0), neutral(name, 1));
  }
  if (tint > 0) {
    for (const name of EDGES) {
      vars[`--ui-${name}`] = pair({ l: EDGE[0], c: nc, h }, { l: EDGE[1], c: nc, h });
    }
  }
  const canvas = [luminance(neutral("canvas", 0)), luminance(neutral("surface", 0))];
  const canvasDark = [luminance(neutral("canvas", 1)), luminance(neutral("surface", 1))];

  // The fill: the most vivid color that holds 3:1 against the page (so a
  // checkbox or switch in it still stands out) and 4.5:1 with the text on
  // it, white or near-black, whichever lets the hue keep more of its color.
  // Blues and reds get white text; yellows and limes get dark text.
  const c = 0.2;
  const lightText: Oklch = { l: 0.99, c: 0, h };
  const darkText: Oklch = { l: 0.18, c: Math.min(nc * 2, 0.02), h };
  const yLight = luminance(lightText);
  const yDark = luminance(darkText);
  const best = { light: null as Oklch | null, dark: null as Oklch | null };
  for (let l = 0.3; l <= 0.95; l += 0.005) {
    const color = fit({ l, c, h });
    const y = luminance(color);
    if (canvas.some((bg) => contrast(y, bg) < 3)) continue;
    // Chroma first; between near-equals, the lighter one.
    const better = (than: Oklch | null) => !than || color.c + l * 0.02 > than.c + than.l * 0.02;
    if (contrast(y, yLight) >= 4.5 && better(best.light)) best.light = color;
    if (contrast(y, yDark) >= 4.5 && better(best.dark)) best.dark = color;
  }
  // White text, except for yellows through limes, where near-black text
  // lets the fill keep more of its color.
  const yellowish = h >= 65 && h <= 125;
  const useDarkText = Boolean(best.dark && (!best.light || (yellowish && best.dark.c > best.light.c * 1.1)));
  const fill = (useDarkText ? best.dark : best.light) ?? fit({ l: 0.55, c, h });
  const fillL = fill.l;
  // Dark themes keep the same fill if it still holds 3:1 on the dark canvas.
  const fillDark = fit({ l: solve(h, c, fillL, 1, canvasDark, 3), c, h });
  const onAccent = useDarkText ? darkText : lightText;
  vars["--ui-accent"] = pair(fill, fillDark);
  vars["--ui-on-accent"] = useDarkText ? css(onAccent) : "oklch(0.99 0 0)";

  // Accent as text: 4.5:1 on both canvas and surface, light and dark.
  const textLight = fit({ l: solve(h, c, 0.55, 0, canvas, 4.5), c, h });
  const textDark = fit({ l: solve(h, c * 0.75, 0.72, 1, canvasDark, 4.5), c: c * 0.75, h });
  vars["--ui-accent-text"] = pair(textLight, textDark);

  if (brand) {
    vars["--ui-ink"] = "var(--ui-accent)";
    vars["--ui-on-ink"] = "var(--ui-on-accent)";
  }

  checks.push(
    { role: "Text on the accent", ratio: round(contrast(luminance(fill), luminance(onAccent)), 2), needed: 4.5 },
    { role: "Accent text on the page, light", ratio: round(Math.min(...canvas.map((y) => contrast(luminance(textLight), y))), 2), needed: 4.5 },
    { role: "Accent text on the page, dark", ratio: round(Math.min(...canvasDark.map((y) => contrast(luminance(textDark), y))), 2), needed: 4.5 },
    { role: "Accent fill on the page, dark", ratio: round(Math.min(...canvasDark.map((y) => contrast(luminance(fillDark), y))), 2), needed: 3 },
  );

  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  const label = `hue ${round(h, 1)}${tint ? `, ${tint === 1 ? "a hint of" : "tinted"} grays` : ""}${brand ? ", accent buttons" : ""}`;
  return {
    vars,
    checks,
    css: `/* UI Polish theme: ${label}. Paste after tokens.css. */\n:root {\n${lines.join("\n")}\n}\n`,
  };
}

/** Named starting points for the picker. */
export const THEME_PRESETS = [
  { name: "Blue", hue: 262 },
  { name: "Violet", hue: 295 },
  { name: "Pink", hue: 350 },
  { name: "Red", hue: 25 },
  { name: "Orange", hue: 50 },
  { name: "Amber", hue: 80 },
  { name: "Green", hue: 150 },
  { name: "Teal", hue: 190 },
] as const;
