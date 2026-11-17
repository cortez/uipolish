"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./voice-input.module.css";

export type VoiceRecording = {
  /** Null when simulated or MediaRecorder isn't available. */
  blob: Blob | null;
  /** Milliseconds. */
  duration: number;
};

type Status = "idle" | "requesting" | "recording" | "denied" | "error" | "done";

type VoiceInputProps = {
  /** Called when recording stops via Stop or the time limit; never on cancel. */
  onComplete?: (recording: VoiceRecording) => void;
  /** Called when a finished recording is thrown away. */
  onDiscard?: () => void;
  /** Seconds. */
  maxDuration?: number;
  /** Fake the microphone for demos and tests; "deny" simulates a blocked mic. */
  simulate?: "allow" | "deny";
  /** Shown while idle. */
  children?: ReactNode;
  className?: string;
};

const SAMPLE_MS = 60;
const BAR_WIDTH = 2;
const BAR_GAP = 2;
const PITCH = BAR_WIDTH + BAR_GAP;
const SILENT_ALPHA = 0.3;
const GROW_MS = 140;

const MESSAGES: Record<string, string> = {
  denied: "Microphone blocked. Allow it in site settings, then try again.",
  missing: "No microphone found. Connect one, then try again.",
  insecure: "Voice input needs a secure (https) page.",
  failed: "Couldn’t start the microphone. Try again.",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function spoken(seconds: number) {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m} minute${m === 1 ? "" : "s"}${rest ? ` ${rest} second${rest === 1 ? "" : "s"}` : ""}`;
}

/** Simulated speech-like level for `simulate`. */
function speechLike() {
  let until = 0;
  let speaking = false;
  let syllableEnd = 0;
  let syllableLength = 1;
  let peak = 0;
  return (now: number) => {
    if (now > until) {
      speaking = !speaking;
      until = now + (speaking ? 800 + Math.random() * 1800 : 300 + Math.random() * 700);
    }
    if (!speaking) return Math.random() * 0.04;
    if (now > syllableEnd) {
      syllableLength = 120 + Math.random() * 180;
      syllableEnd = now + syllableLength;
      peak = 0.3 + Math.random() * 0.7;
    }
    // Clamped: t can round a hair below 0, and a negative base to a fractional power is NaN.
    const t = Math.min(Math.max(1 - (syllableEnd - now) / syllableLength, 0), 1);
    return 0.05 + peak * Math.max(0, Math.sin(Math.PI * t)) ** 1.5;
  };
}

/** RMS level mapped from -55…-10 dBFS onto 0…1. */
function levelOf(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>) {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (const v of buffer) sum += v * v;
  const rms = Math.sqrt(sum / buffer.length);
  const db = 20 * Math.log10(rms || 1e-8);
  return Math.min(1, Math.max(0, (db + 55) / 45)) ** 1.6;
}

const settle = (t: number) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 5;

type Sample = { v: number; t: number };

type Session = {
  stream: MediaStream | null;
  context: AudioContext | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  frame: number;
  started: number;
  keep: boolean;
};

export function VoiceInput({
  onComplete,
  onDiscard,
  maxDuration = 300,
  simulate,
  children,
  className,
}: VoiceInputProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const meterRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLButtonElement>(null);
  const history = useRef<Sample[]>([]);
  const clock = useRef(0);
  const ink = useRef("");
  const box = useRef({ width: 0, height: 0 });
  const session = useRef<Session | null>(null);
  // Bumped whenever a request is abandoned, so a late permission answer is ignored.
  const attempt = useRef(0);
  const callbacks = useRef({ onComplete, maxDuration });
  useLayoutEffect(() => {
    callbacks.current = { onComplete, maxDuration };
  });

  useLayoutEffect(() => {
    const canvas = meterRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    let query: MediaQueryList | null = null;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.current.width * ratio);
      canvas.height = Math.round(box.current.height * ratio);
      ink.current = "";
      paint();
      // A zoom only shows up as a new pixel ratio, so watch for the next one.
      query?.removeEventListener("change", fit);
      query = matchMedia(`(resolution: ${ratio}dppx)`);
      query.addEventListener("change", fit);
    };
    const observer = new ResizeObserver(([entry]) => {
      box.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      fit();
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      query?.removeEventListener("change", fit);
    };
  }, []);

  function paint() {
    const canvas = meterRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.width) return;
    // The ratio the backing was made at, not a newer one mid-zoom.
    const { width, height } = box.current;
    const ratio = canvas.width / width;
    const values = history.current;
    const now = clock.current;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const newest = values.length ? values[values.length - 1].t : now;
    const slide = still ? 0 : Math.min(PITCH, ((now - newest) / SAMPLE_MS) * PITCH);
    const rtl = getComputedStyle(canvas).direction === "rtl";
    if (!ink.current) ink.current = getComputedStyle(canvas).color;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = ink.current;
    for (let k = 0; ; k++) {
      const from = width - BAR_WIDTH - k * PITCH - slide;
      if (from < -BAR_WIDTH) break;
      const sample = values[values.length - 1 - k];
      const grow = !sample || still ? 1 : settle((now - sample.t) / GROW_MS);
      const level = (sample?.v ?? 0) * grow;
      const h = BAR_WIDTH + (height - BAR_WIDTH) * level;
      ctx.globalAlpha = SILENT_ALPHA + (1 - SILENT_ALPHA) * Math.min(1, level * 5);
      const x = Math.round((rtl ? width - BAR_WIDTH - from : from) * ratio) / ratio;
      ctx.beginPath();
      ctx.roundRect(x, (height - h) / 2, BAR_WIDTH, h, BAR_WIDTH / 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function release(s: Session) {
    cancelAnimationFrame(s.frame);
    s.stream?.getTracks().forEach((t) => t.stop());
    s.context?.close().catch(() => {});
  }

  useEffect(
    () => () => {
      attempt.current++;
      const s = session.current;
      if (s) {
        s.keep = false;
        if (s.recorder?.state === "recording") s.recorder.stop();
        release(s);
        session.current = null;
      }
    },
    [],
  );

  function begin(stream: MediaStream | null) {
    const started = performance.now();
    const s: Session = { stream, context: null, recorder: null, chunks: [], frame: 0, started, keep: false };
    session.current = s;
    history.current = [];
    clock.current = started;
    ink.current = "";

    let read: (now: number) => number;
    if (stream) {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      s.context = context;
      read = () => levelOf(analyser, buffer);
      if (typeof MediaRecorder !== "undefined") {
        try {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size) s.chunks.push(e.data);
          };
          recorder.onstop = () => finish(s);
          recorder.start();
          s.recorder = recorder;
        } catch {
          // No supported format: the recording reports a null blob.
        }
      }
    } else {
      read = speechLike();
    }

    let level = 0;
    let next = started;
    let lastSecond = 0;
    const tick = (now: number) => {
      if (session.current !== s) return;
      // One bad reading would turn the smoothed level into NaN for good.
      const raw = read(now);
      if (Number.isFinite(raw)) level += (raw - level) * (raw > level ? 0.6 : 0.3);
      while (now - next >= 0) {
        history.current.push({ v: level, t: next });
        next += SAMPLE_MS;
      }
      if (history.current.length > 600) history.current.splice(0, 300);
      clock.current = now;
      paint();
      const seconds = (now - s.started) / 1000;
      if (Math.floor(seconds) !== lastSecond) {
        lastSecond = Math.floor(seconds);
        setElapsed(lastSecond);
      }
      if (seconds >= callbacks.current.maxDuration) {
        stop();
        return;
      }
      s.frame = requestAnimationFrame(tick);
    };
    s.frame = requestAnimationFrame(tick);

    setElapsed(0);
    setStatus("recording");
    setAnnouncement("Recording. Press Escape to cancel.");
  }

  function finish(s: Session) {
    if (!s.keep) return;
    s.keep = false;
    const duration = performance.now() - s.started;
    const type = s.recorder?.mimeType || "audio/webm";
    const blob = s.chunks.length ? new Blob(s.chunks, { type }) : null;
    callbacks.current.onComplete?.({ blob, duration });
  }

  async function start() {
    const id = ++attempt.current;
    setStatus("requesting");
    setAnnouncement("Waiting for microphone permission");

    if (simulate) {
      await new Promise((r) => setTimeout(r, 700));
      if (id !== attempt.current) return;
      if (simulate === "deny") return fail("denied");
      return begin(null);
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return fail("insecure");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (id !== attempt.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      begin(stream);
    } catch (error) {
      if (id !== attempt.current) return;
      const name = error instanceof DOMException ? error.name : "";
      fail(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "missing" : "failed");
    }
  }

  function fail(kind: keyof typeof MESSAGES) {
    setMessage(MESSAGES[kind]);
    setStatus(kind === "denied" ? "denied" : "error");
    setAnnouncement(MESSAGES[kind]);
  }

  function stop() {
    const s = session.current;
    if (!s) return;
    s.keep = true;
    const now = performance.now();
    const seconds = (now - s.started) / 1000;
    setElapsed(Math.floor(seconds));
    clock.current = now;
    paint();
    if (s.recorder && s.recorder.state === "recording") s.recorder.stop();
    else finish(s);
    release(s);
    setStatus("done");
    setAnnouncement(`Recording stopped. ${spoken(seconds)}.`);
  }

  function cancel() {
    const wasDone = status === "done";
    const s = session.current;
    attempt.current++;
    if (s) {
      s.keep = false;
      if (s.recorder?.state === "recording") s.recorder.stop();
      release(s);
      session.current = null;
    }
    setStatus("idle");
    setAnnouncement(wasDone ? "Recording discarded" : "Recording canceled");
    if (wasDone) onDiscard?.();
    // The cancel button becomes inert, so move focus before it's lost.
    mainRef.current?.focus();
  }

  function onMain() {
    if (status === "requesting") return;
    if (status === "recording") stop();
    else start();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || (status !== "recording" && status !== "requesting")) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
  }

  const recording = status === "recording";
  const done = status === "done";
  const inSession = recording || done;
  const layer = inSession ? "session" : status === "denied" || status === "error" ? "message" : status;
  const label = recording
    ? "Stop recording"
    : status === "requesting"
      ? "Waiting for microphone permission"
      : done
        ? "Record again"
        : status === "denied" || status === "error"
          ? "Try the microphone again"
          : "Record a voice message";
  const timeChars = formatTime(maxDuration).length;

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      onKeyDown={onKeyDown}
      style={{ "--time-chars": timeChars } as CSSProperties}
    >
      <span className={styles.capsule} aria-hidden="true" />

      <div className={styles.stage}>
        <div className={styles.layer} data-active={layer === "idle" || undefined} inert={layer !== "idle"}>
          {children}
        </div>

        <div className={styles.layer} data-active={layer === "requesting" || undefined} inert={layer !== "requesting"}>
          <span className={styles.waiting}>Waiting for microphone permission…</span>
        </div>

        <div className={styles.layer} data-active={layer === "message" || undefined} inert={layer !== "message"}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={`${styles.layer} ${styles.session}`} data-active={layer === "session" || undefined} inert={layer !== "session"}>
          <button
            type="button"
            className={styles.action}
            aria-label={done ? "Discard recording" : "Cancel recording"}
            onClick={cancel}
          >
            <Icon name={done ? "trash" : "close"} />
          </button>
          <canvas ref={meterRef} className={styles.meter} aria-hidden="true" />
          <span className={styles.time}>
            <span className={styles.live} aria-hidden="true" />
            <span className={styles.srOnly}>{recording ? "Recording, " : "Recorded "}</span>
            <time dateTime={`PT${elapsed}S`} className={styles.clock}>
              <TextMorph>{formatTime(elapsed)}</TextMorph>
            </time>
          </span>
        </div>
      </div>

      <button
        ref={mainRef}
        type="button"
        className={styles.main}
        aria-label={label}
        aria-busy={status === "requesting" || undefined}
        aria-disabled={status === "requesting" || undefined}
        onClick={onMain}
      >
        <Icon name={recording ? "stop" : "mic"} />
      </button>

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}
