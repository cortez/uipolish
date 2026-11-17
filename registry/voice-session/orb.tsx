"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import styles from "./voice-session.module.css";

/** How loud each side is right now, 0 to 1. */
export type VoiceLevels = { user: number; agent: number };

/** Who the visual is showing. */
export type VoiceSpeaker = "user" | "agent" | null;

/** What the bars do: hold still as dots, follow a voice, or run one slow wave while waiting. */
export type OrbMode = "still" | "level" | "wave";

type OrbProps = {
  mode: OrbMode;
  /** Read once a frame. */
  read: () => VoiceLevels;
  /** The agent is talking: its voice drives the bars between words too. */
  agentTurn: boolean;
  /** The user's voice is ignored. */
  muted: boolean;
  onSpeaker: (speaker: VoiceSpeaker) => void;
};

const BARS = 5;
const BAR = 8;
const GAP = 6;
const WIDTH = BARS * BAR + (BARS - 1) * GAP;
const HEIGHT = 48;
/* The middle bar reaches furthest, so the shape reads as a voice, not a meter. */
const REACH = [0.52, 0.8, 1, 0.8, 0.52];
/* Each bar sways on its own slow sine, so a steady level still looks spoken. No noise: the same time draws the same frame. */
const SWAY = [
  [0.0071, 0.4],
  [0.0093, 2.1],
  [0.0062, 4.0],
  [0.0088, 1.3],
  [0.0077, 3.2],
] as const;

/** Reads a duration token in ms; falls back when the stylesheet isn't there. */
function token(el: Element, name: string, fallback: number) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return raw.endsWith("ms") ? n : n * 1000;
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * The call's visual: five bars on a disc. Silent, they rest as dots and hold
 * still. A voice lifts them, smoothed on the motion tokens (rising over
 * --ui-dur-instant, falling over --ui-dur-panel), so they never jitter. While
 * waiting, one slow wave runs across them.
 */
export function Orb({ mode, read, agentTurn, muted, onSpeaker }: OrbProps) {
  const discRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ mode, read, agentTurn, muted, onSpeaker });
  useLayoutEffect(() => {
    live.current = { mode, read, agentTurn, muted, onSpeaker };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const disc = discRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !disc || !ctx) return;

    const rise = token(canvas, "--ui-dur-instant", 120) / 3;
    const fall = token(canvas, "--ui-dur-panel", 280) / 3;
    const period = token(canvas, "--ui-dur-pulse", 700) * 2;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    let ratio = 0;
    let frame = 0;
    let last = performance.now();
    let user = 0;
    let agent = 0;
    let speaker: VoiceSpeaker = null;
    let userQuietSince = 0;

    const fit = () => {
      const r = window.devicePixelRatio || 1;
      if (r === ratio) return;
      ratio = r;
      canvas.width = Math.round(WIDTH * r);
      canvas.height = Math.round(HEIGHT * r);
    };

    const ease = (from: number, to: number, dt: number) => from + (to - from) * (1 - Math.exp(-dt / (to > from ? rise : fall)));

    const draw = (now: number) => {
      fit();
      const dt = Math.min(64, now - last);
      last = now;
      const { mode, read, agentTurn, muted, onSpeaker } = live.current;
      const levels = mode === "level" ? read() : { user: 0, agent: 0 };
      user = ease(user, muted ? 0 : clamp(levels.user), dt);
      agent = ease(agent, agentTurn ? clamp(levels.agent) : 0, dt);

      // The user wins a tie: talking over the agent is how you interrupt it.
      // A short hold keeps the gaps between their words from flickering.
      let next: VoiceSpeaker = null;
      if (mode === "level") {
        if (user > 0.08) userQuietSince = 0;
        else if (user < 0.03 && !userQuietSince) userQuietSince = now;
        const userTalking = user > 0.08 || (speaker === "user" && (!userQuietSince || now - userQuietSince < 400));
        next = userTalking ? "user" : agentTurn ? "agent" : null;
      }
      if (next !== speaker) {
        speaker = next;
        disc.dataset.speaker = next ?? "";
        onSpeaker(next);
      }

      const level = speaker === "user" ? user : speaker === "agent" ? agent : Math.max(user, agent);
      disc.style.setProperty("--vs-level", level.toFixed(3));

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = getComputedStyle(canvas).color;
      const still = reduce.matches;
      for (let i = 0; i < BARS; i++) {
        let h = BAR;
        let alpha = 1;
        if (mode === "wave") {
          // One crest travels left to right; with reduced motion they breathe together.
          const phase = (now / period) * Math.PI * 2;
          const crest = still ? 0.5 + 0.5 * Math.sin(phase / 2) : Math.max(0, Math.sin(phase - i * 0.75)) ** 2;
          if (still) alpha = 0.4 + 0.6 * crest;
          else {
            h = BAR + 8 * crest;
            alpha = 0.45 + 0.55 * crest;
          }
        } else if (mode === "level") {
          const [f, p] = SWAY[i];
          const sway = 0.72 + 0.28 * Math.sin(now * f + p);
          if (still) alpha = 0.35 + 0.65 * Math.min(1, level * 2.2);
          else h = BAR + (HEIGHT - BAR) * Math.min(1, level * 1.7) ** 0.8 * REACH[i] * sway;
        } else {
          alpha = 0.55;
        }
        const x = i * (BAR + GAP);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.roundRect(x, (HEIGHT - h) / 2, BAR, h, BAR / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span ref={discRef} className={styles.disc} data-mode={mode} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.bars} width={WIDTH} height={HEIGHT} />
    </span>
  );
}
