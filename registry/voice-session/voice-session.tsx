"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Select } from "../select/select";
import { TextMorph } from "../text-morph/text-morph";
import { Tooltip } from "../tooltip/tooltip";
import { Orb, type OrbMode, type VoiceLevels, type VoiceSpeaker } from "./orb";
import { CaptionsGlyph, HangUpGlyph, MicGlyph, MicHelp, SummaryCard, type VoiceBrowser, type VoiceSummary } from "./panels";
import { Transcript, formatCallTime, type VoiceTranscriptItem } from "./transcript";
import styles from "./voice-session.module.css";

export type { VoiceLevels, VoiceSpeaker } from "./orb";
export type { VoiceBrowser, VoiceFollowUp, VoiceSummary } from "./panels";
export { formatCallTime, type VoiceTranscriptItem } from "./transcript";

/**
 * Where the call is.
 * - `requesting`: the browser is asking for the microphone.
 * - `connecting`: reaching the agent. After `slowAfter`, it says so and offers Cancel.
 * - `live`: talking. `activity` says what the agent is doing.
 * - `reconnecting`: the network dropped; the call holds.
 * - `error`: the agent failed; the line is still up. Say what happened in `error`.
 * - `denied`, `no-mic`: the call can't start; how to fix it shows instead.
 * - `ended`: the summary shows.
 */
export type VoiceSessionStatus = "requesting" | "connecting" | "live" | "reconnecting" | "error" | "denied" | "no-mic" | "ended";

/** What the agent is doing while `live`. */
export type VoiceActivity = "listening" | "thinking" | "speaking";

export type VoiceDevice = {
  /** `deviceId` from `enumerateDevices()`. */
  id: string;
  /** The device's name, as the system gives it: "MacBook Pro Microphone". */
  label: string;
  /** One quiet line under it in the list: "Built-in", "Bluetooth". */
  detail?: string;
};

type VoiceSessionProps = {
  /** The agent's name, as the person knows it. */
  agentName?: string;
  /** The agent's picture. Without one, its initial. */
  agentImage?: string;
  /** What the call is about, under the name: "Menu for Saturday’s supper". */
  topic?: string;
  status: VoiceSessionStatus;
  /** While `live`. Default `listening`. */
  activity?: VoiceActivity;
  /**
   * How loud each side is, 0 to 1. Pass a function to have it read once a
   * frame (from an `AnalyserNode`, say) without re-rendering the block; or a
   * value, if you already re-render at that rate. The visual smooths it either way.
   */
  levels?: VoiceLevels | (() => VoiceLevels);
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** The live transcript is showing. Default true. */
  captions?: boolean;
  onCaptionsChange?: (captions: boolean) => void;
  /** Microphones to choose from. The picker shows when there's at least one. */
  devices?: VoiceDevice[];
  deviceId?: string;
  onDeviceChange?: (id: string) => void;
  transcript: VoiceTranscriptItem[];
  /** `Date.now()` when the call connected. Drives the timer. */
  startedAt?: number;
  /** `Date.now()` when it ended. The timer holds there. */
  endedAt?: number;
  /** `error`: what happened, and what it means for the call. */
  error?: string;
  /** Ms of `connecting` before it says it's slow. Default 6000. */
  slowAfter?: number;
  /** Which browser's steps to show first when the mic is blocked. Default: the one in use. */
  browser?: VoiceBrowser;
  /** Stop the agent mid-sentence. Shown while it speaks. Talking over it should do the same. */
  onInterrupt?: () => void;
  /** Hang up, or cancel a slow connection. The block shows the summary once `status` is `ended`. */
  onEnd?: () => void;
  /** Ask for the mic again (`denied`, `no-mic`), or retry the agent (`error`). */
  onRetry?: () => void;
  /** `ended`: what the call came to. Leave it out while it's being written. */
  summary?: VoiceSummary;
  /** `ended`: the summary couldn't be written. */
  summaryError?: string;
  onRetrySummary?: () => void;
  onCallAgain?: () => void;
  className?: string;
};

const ZERO: VoiceLevels = { user: 0, agent: 0 };

type Label = "requesting" | "connecting" | "listening" | "thinking" | "speaking" | "muted" | "reconnecting" | "error";

const LABEL: Record<Label, string> = {
  requesting: "Allow microphone",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  muted: "Muted",
  reconnecting: "Reconnecting…",
  error: "Not responding",
};
const LABELS = Object.values(LABEL);

type Tone = "neutral" | "user" | "agent" | "muted" | "warning" | "danger";
type Flash = { text: string; tone: "success" | "neutral"; at: number };

const IN_CALL: VoiceSessionStatus[] = ["requesting", "connecting", "live", "reconnecting", "error"];

/** The same string with every digit as an 8: the widest a number of that shape gets. */
const widest = (s: string) => s.replace(/\d/g, "8");

function spokenDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (!m) return `${rest} second${rest === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"}${rest ? ` ${rest} second${rest === 1 ? "" : "s"}` : ""}`;
}

/** Ticks twice a second while `on`; holds its last value otherwise. Starts after mount. */
function useClock(on: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    if (!on) return () => window.clearTimeout(first);
    const id = window.setInterval(tick, 500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [on]);
  return now;
}

/** A line that trades its text by crossfade: the old one drops first, the new one arrives half a beat later. */
function Swap({ text, tone, className }: { text: string; tone?: string; className: string }) {
  const [layers, setLayers] = useState([{ text, tone, leaving: false, enter: false }]);
  const current = layers[layers.length - 1];
  if (current.text !== text || current.tone !== tone) {
    setLayers([
      ...layers.filter((l) => !l.leaving && l.text !== text).map((l) => ({ ...l, leaving: true })),
      { text, tone, leaving: false, enter: true },
    ]);
  }
  return (
    <p className={className}>
      {layers.map((l) => (
        <span
          key={`${l.text}|${l.tone}|${l.leaving}`}
          className={styles.swapLayer}
          data-tone={l.tone}
          data-leaving={l.leaving || undefined}
          data-enter={l.enter || undefined}
          aria-hidden={l.leaving || undefined}
          onAnimationEnd={(e) => {
            if (l.leaving && e.target === e.currentTarget) setLayers((all) => all.filter((x) => x !== l));
          }}
        >
          {l.text}
        </span>
      ))}
    </p>
  );
}

/** A live voice call with an agent: who's talking, what it's doing, the words as they're said, and a summary at the end. */
export function VoiceSession({
  agentName = "Assistant",
  agentImage,
  topic,
  status,
  activity = "listening",
  levels,
  muted = false,
  onMutedChange,
  captions = true,
  onCaptionsChange,
  devices = [],
  deviceId,
  onDeviceChange,
  transcript,
  startedAt,
  endedAt,
  error,
  slowAfter = 6000,
  browser,
  onInterrupt,
  onEnd,
  onRetry,
  summary,
  summaryError,
  onRetrySummary,
  onCallAgain,
  className,
}: VoiceSessionProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const rootRef = useRef<HTMLElement>(null);
  const muteRef = useRef<HTMLButtonElement>(null);

  // Levels are read by the visual each frame, never through render.
  const levelsRef = useRef(levels);
  useLayoutEffect(() => {
    levelsRef.current = levels;
  });
  const read = useCallback(() => {
    const l = levelsRef.current;
    return (typeof l === "function" ? l() : l) ?? ZERO;
  }, []);

  const [speaker, setSpeaker] = useState<VoiceSpeaker>(null);
  const inCall = IN_CALL.includes(status);
  const live = status === "live";
  const agentTurn = live && activity === "speaking";

  // ---------- What changed: announcements and the brief confirmations ----------

  const interruptedIds = transcript
    .filter((t) => t.role === "agent" && t.interrupted)
    .map((t) => t.id)
    .join(" ");
  const [seen, setSeen] = useState({ status, muted, captions, interruptedIds, attempt: 0 });
  const [announcement, setAnnouncement] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);
  if (seen.status !== status || seen.muted !== muted || seen.captions !== captions || seen.interruptedIds !== interruptedIds) {
    let say = "";
    let nextFlash: Flash | null | undefined;
    if (seen.status !== status) {
      nextFlash = null;
      if (status === "requesting") say = "Waiting for microphone permission.";
      else if (status === "connecting") say = `Connecting to ${agentName}.`;
      else if (status === "reconnecting") say = "Connection lost. Reconnecting.";
      else if (status === "error") say = error ?? `${agentName} stopped responding.`;
      else if (status === "denied") say = "Microphone blocked.";
      else if (status === "no-mic") say = "No microphone found.";
      else if (status === "ended") say = `Call ended after ${spokenDuration((endedAt ?? 0) - (startedAt ?? endedAt ?? 0))}.`;
      else if (status === "live") {
        if (seen.status === "reconnecting") {
          say = "Reconnected.";
          nextFlash = { text: "Reconnected. Nothing was lost.", tone: "success", at: seen.attempt + 1 };
        } else if (seen.status === "error") say = `${agentName} is back.`;
        else say = `Connected. ${agentName} is listening.`;
      }
    } else if (seen.muted !== muted) say = muted ? "Microphone off." : "Microphone on.";
    else if (seen.captions !== captions) say = captions ? "Captions on." : "Captions off.";
    else if (interruptedIds.length > seen.interruptedIds.length) {
      say = `${agentName} stopped.`;
      nextFlash = { text: `${agentName} stopped so you can talk.`, tone: "neutral", at: seen.attempt + 1 };
    }
    setSeen({ status, muted, captions, interruptedIds, attempt: seen.attempt + 1 });
    if (say) setAnnouncement(say);
    if (nextFlash !== undefined) setFlash(nextFlash);
  }

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash((f) => (f === flash ? null : f)), 2800);
    return () => window.clearTimeout(t);
  }, [flash]);

  // A connection that hangs says so. Each attempt gets its own timer.
  const [slowAttempt, setSlowAttempt] = useState(-1);
  const connectAttempt = status === "connecting" ? seen.attempt : -1;
  useEffect(() => {
    if (connectAttempt < 0) return;
    const t = window.setTimeout(() => setSlowAttempt(connectAttempt), slowAfter);
    return () => window.clearTimeout(t);
  }, [connectAttempt, slowAfter]);
  const slow = connectAttempt >= 0 && slowAttempt === connectAttempt;

  // ---------- Keys: M mutes, C toggles captions ----------

  const keys = useRef({ inCall, muted, captions, onMutedChange, onCaptionsChange });
  useLayoutEffect(() => {
    keys.current = { inCall, muted, captions, onMutedChange, onCaptionsChange };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='combobox'], [role='listbox'], [role='menu'], [role='dialog']")) return;
      const k = keys.current;
      if (!k.inCall) return;
      const key = e.key.toLowerCase();
      if (key === "m" && k.onMutedChange) {
        e.preventDefault();
        k.onMutedChange(!k.muted);
      } else if (key === "c" && k.onCaptionsChange) {
        e.preventDefault();
        k.onCaptionsChange(!k.captions);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Clock ----------

  const now = useClock((live || status === "reconnecting" || status === "error") && startedAt !== undefined);
  let elapsed = 0;
  if (startedAt !== undefined) elapsed = Math.max(0, (endedAt ?? now ?? startedAt) - startedAt);
  const clock = formatCallTime(elapsed);

  // ---------- The stage: label, tone, hint, one action ----------

  const runningTool = [...transcript].reverse().find((t) => t.role === "tool" && t.status === "running");
  let label: Label = "listening";
  let tone: Tone = "neutral";
  let mode: OrbMode = "still";
  if (status === "requesting") label = "requesting";
  else if (status === "connecting") {
    label = "connecting";
    mode = "wave";
  } else if (status === "reconnecting") {
    label = "reconnecting";
    tone = "warning";
    mode = "wave";
  } else if (status === "error") {
    label = "error";
    tone = "danger";
  } else if (live) {
    mode = activity === "thinking" ? "wave" : "level";
    if (speaker === "user") {
      label = "listening";
      tone = "user";
    } else if (activity === "speaking") {
      label = "speaking";
      tone = "agent";
    } else if (activity === "thinking") {
      label = "thinking";
      tone = "agent";
    } else if (muted) {
      label = "muted";
      tone = "muted";
    }
  }

  let hint = "";
  let hintTone: "success" | "neutral" = "neutral";
  if (status === "requesting") hint = "Your browser is asking to use the microphone. Choose Allow.";
  else if (status === "connecting")
    hint = slow ? "This is taking longer than usual. Check your connection, or keep waiting." : "This takes a second or two.";
  else if (status === "reconnecting") {
    hint = "Your connection dropped. The call picks up where it left off.";
  } else if (status === "error") {
    hint = error ?? `${agentName} stopped responding. Try again, or end the call.`;
  } else if (flash) {
    hint = flash.text;
    hintTone = flash.tone;
  } else if (muted) hint = activity === "listening" ? `${agentName} can’t hear you. Unmute to talk.` : "You’re muted. Unmute to talk.";
  else if (activity === "speaking") hint = onInterrupt ? `Start talking to interrupt.` : `${agentName} is talking.`;
  else if (activity === "thinking") hint = runningTool?.role === "tool" ? runningTool.title : "Working out an answer.";
  else hint = "Talk whenever you’re ready.";

  type Action = { key: string; label: string; icon: "stop" | "retry" | "close"; variant: "secondary" | "primary"; onClick: () => void };
  let action: Action | null = null;
  if (agentTurn && onInterrupt && speaker !== "user") action = { key: "interrupt", label: "Interrupt", icon: "stop", variant: "secondary", onClick: onInterrupt };
  else if (status === "error" && onRetry) action = { key: "retry", label: "Try again", icon: "retry", variant: "primary", onClick: onRetry };
  else if (status === "connecting" && slow && onEnd) action = { key: "cancel", label: "Cancel", icon: "close", variant: "secondary", onClick: onEnd };

  // The action leaves with the state it served; if it had focus, Mute takes it.
  const actionHadFocus = useRef(false);
  const actionKey = action?.key ?? "";
  useLayoutEffect(() => {
    if (actionKey || !actionHadFocus.current) return;
    actionHadFocus.current = false;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    muteRef.current?.focus({ preventScroll: true });
  }, [actionKey]);

  // Hanging up takes the controls away: focus lands on the summary.
  useEffect(() => {
    if (status !== "ended") return;
    const root = rootRef.current;
    const focused = document.activeElement;
    if (!root || (focused && focused !== document.body && !root.contains(focused))) return;
    root.querySelector<HTMLElement>("[data-summary-title]")?.focus({ preventScroll: true });
  }, [status]);

  const help = status === "denied" || status === "no-mic";
  const layout = status === "ended" || help ? "full" : captions ? "split" : "solo";
  const speakerName = speaker === "user" ? "You" : speaker === "agent" ? agentName : "";

  const deviceOptions = devices.map((d) => ({ value: d.id, label: d.label, description: d.detail }));
  const timerShown = startedAt !== undefined;

  return (
    <section
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-status={status}
      data-layout={layout}
      data-tone={tone}
      aria-labelledby={titleId}
    >
      <header className={styles.head}>
        <Avatar name={agentName} src={agentImage} size={32} decorative />
        <div className={styles.heading}>
          <h3 id={titleId} className={styles.agentName}>
            <span className={styles.srOnly}>Call with </span>
            {agentName}
          </h3>
          {topic && <p className={styles.topic}>{topic}</p>}
        </div>
        <p className={styles.timer} data-shown={timerShown || undefined}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span className={styles.srOnly}>{status === "ended" ? "Call length: " : "Call time: "}</span>
          <span className={styles.counter}>
            {[...new Set([widest(clock), "88:88"])].map((r) => (
              <span key={r} className={styles.reserve} aria-hidden="true">
                {r}
              </span>
            ))}
            <time className={styles.counterValue} dateTime={`PT${Math.floor(elapsed / 1000)}S`}>
              {clock}
            </time>
          </span>
        </p>
      </header>

      <div className={styles.body}>
        {status === "ended" ? (
          <div className={`${styles.panel} ${styles.full}`}>
            <SummaryCard
              agentName={agentName}
              topic={topic}
              duration={elapsed}
              summary={summary}
              summaryError={summaryError}
              onRetrySummary={onRetrySummary}
              onCallAgain={onCallAgain}
              transcript={transcript}
            />
          </div>
        ) : help ? (
          <div className={`${styles.panel} ${styles.full}`}>
            <MicHelp kind={status} agentName={agentName} browser={browser} onRetry={onRetry} onEnd={onEnd} />
          </div>
        ) : (
          <>
            <div className={`${styles.panel} ${styles.stage}`}>
              <div className={styles.stageInner}>
                <Orb mode={mode} read={read} agentTurn={agentTurn} muted={muted} onSpeaker={setSpeaker} />
                <p className={styles.speaker} aria-hidden="true">
                  {["You", agentName].map((n) => (
                    <span key={n} className={styles.speakerName} data-on={n === speakerName || undefined} data-who={n === "You" ? "user" : "agent"}>
                      {n}
                    </span>
                  ))}
                </p>
                <p className={styles.label}>
                  {LABELS.map((l) => (
                    <span key={l} className={styles.reserve} aria-hidden="true">
                      {l}
                    </span>
                  ))}
                  <span className={styles.labelValue}>
                    <TextMorph>{LABEL[label]}</TextMorph>
                  </span>
                </p>
                <Swap className={styles.hint} text={hint} tone={hintTone} />
                <div
                  className={styles.slot}
                  onFocus={() => (actionHadFocus.current = true)}
                  onBlur={(e) => {
                    if (e.relatedTarget) actionHadFocus.current = false;
                  }}
                >
                  {action && (
                    <Button key={action.key} variant={action.variant} className={styles.slotButton} onClick={action.onClick}>
                      {[<Icon key="i" name={action.icon} />, <span key="l">{action.label}</span>]}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.side} inert={!captions}>
              <div className={`${styles.panel} ${styles.sidePanel}`}>
                <Transcript
                  items={transcript}
                  agentName={agentName}
                  empty={status === "live" ? `What you and ${agentName} say shows up here.` : "The transcript starts when the call connects."}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {inCall && (
        <div className={styles.controls}>
          {devices.length > 0 && (
            <div className={styles.device}>
              <Select
                aria-label="Microphone"
                options={deviceOptions}
                value={deviceId ?? devices[0].id}
                onValueChange={onDeviceChange}
                disabled={!onDeviceChange}
              />
            </div>
          )}
          <div className={styles.toggles}>
            {onMutedChange && (
              <Tooltip content={muted ? "Unmute" : "Mute"} kbd="M" describe={false}>
                <Button
                  ref={muteRef}
                  variant="secondary"
                  className={styles.toggle}
                  data-on={muted || undefined}
                  aria-label={muted ? "Unmute" : "Mute"}
                  aria-keyshortcuts="M"
                  onClick={() => onMutedChange(!muted)}
                >
                  {[
                    <MicGlyph key="i" off={muted} />,
                    <span key="l" className={styles.toggleLabel}>
                      {["Mute", "Unmute"].map((r) => (
                        <span key={r} className={styles.reserve} aria-hidden="true">
                          {r}
                        </span>
                      ))}
                      <span className={styles.toggleValue}>
                        <TextMorph>{muted ? "Unmute" : "Mute"}</TextMorph>
                      </span>
                    </span>,
                  ]}
                </Button>
              </Tooltip>
            )}
            {onCaptionsChange && (
              <Tooltip content={captions ? "Hide captions" : "Show captions"} kbd="C" describe={false}>
                <Button
                  variant="secondary"
                  className={styles.toggle}
                  data-on={captions || undefined}
                  aria-label="Captions"
                  aria-pressed={captions}
                  aria-keyshortcuts="C"
                  onClick={() => onCaptionsChange(!captions)}
                >
                  {[
                    <CaptionsGlyph key="i" />,
                    <span key="l" className={styles.toggleLabel}>
                      Captions
                    </span>,
                  ]}
                </Button>
              </Tooltip>
            )}
          </div>
          {onEnd && (
            <Button variant="danger" className={styles.end} aria-label="End call" onClick={onEnd}>
              {[
                <HangUpGlyph key="i" />,
                <span key="l" className={styles.toggleLabel}>
                  End call
                </span>,
              ]}
            </Button>
          )}
        </div>
      )}

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </section>
  );
}
