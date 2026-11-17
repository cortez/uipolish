"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Segment, SegmentedControl } from "../segmented-control/segmented-control";
import { Transcript, formatCallTime, type VoiceTranscriptItem } from "./transcript";
import styles from "./voice-session.module.css";

export type VoiceBrowser = "chrome" | "safari" | "firefox" | "edge";

/** Something to do after the call, and whose it is. */
export type VoiceFollowUp = {
  id: string;
  text: string;
  /** Who does it: the agent ("I'll remind you Thursday") or the person. */
  owner?: "agent" | "user";
  /** When, in words: "Thu, 9 am". */
  due?: string;
};

/** What the call came to. Written by your agent after it ends. */
export type VoiceSummary = {
  /** What was settled, a line each. */
  decisions: string[];
  followUps: VoiceFollowUp[];
};

/* ---------- Glyphs the icon set doesn't have ---------- */

/** A mic whose slash draws across it when muted. */
export function MicGlyph({ off }: { off: boolean }) {
  const mask = `vs-mic-${useId()}`;
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} data-off={off || undefined} aria-hidden="true">
      <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
        <rect width="16" height="16" fill="white" />
        <path className={styles.slashCut} d="M2.75 2.75 L13.25 13.25" pathLength={1} stroke="black" />
      </mask>
      <g mask={`url(#${mask})`}>
        <path d="M8 2.25a2.25 2.25 0 0 0-2.25 2.25v3.25a2.25 2.25 0 0 0 4.5 0V4.5A2.25 2.25 0 0 0 8 2.25Z" />
        <path d="M3.75 7.5a4.25 4.25 0 0 0 8.5 0" />
        <path d="M8 11.75v2" />
      </g>
      <path className={styles.slash} d="M2.75 2.75 L13.25 13.25" pathLength={1} />
    </svg>
  );
}

export function CaptionsGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <path d="M2.25 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-7.5a2 2 0 0 1-2-2Z" />
      <path d="M4.75 7.25h3.5M9.75 7.25h1.5M4.75 9.75h1.5M8.25 9.75h3" />
    </svg>
  );
}

/** A handset laid down: the universal hang-up. */
export function HangUpGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <path d="M2.25 9.6c0-1.6 2.6-3.35 5.75-3.35s5.75 1.75 5.75 3.35v.6a.9.9 0 0 1-1 .9l-1.9-.25a.9.9 0 0 1-.78-.9V8.7a6.6 6.6 0 0 0-4.14 0v1.25a.9.9 0 0 1-.78.9l-1.9.25a.9.9 0 0 1-1-.9Z" />
    </svg>
  );
}

/* ---------- Microphone blocked or missing ---------- */

const BROWSERS: { id: VoiceBrowser; name: string; steps: string[] }[] = [
  {
    id: "chrome",
    name: "Chrome",
    steps: [
      "Click the site controls icon at the left end of the address bar.",
      "Turn Microphone on.",
      "Come back here and choose Try again.",
    ],
  },
  {
    id: "safari",
    name: "Safari",
    steps: [
      "In the menu bar, choose Safari › Settings for This Website.",
      "Set Microphone to Allow.",
      "Choose Try again.",
    ],
  },
  {
    id: "firefox",
    name: "Firefox",
    steps: [
      "Click the crossed-out microphone in the address bar.",
      "Clear “Blocked Temporarily” next to Use the microphone.",
      "Choose Try again, then Allow.",
    ],
  },
  {
    id: "edge",
    name: "Edge",
    steps: [
      "Click View site information (the lock) in the address bar.",
      "Choose Permissions for this site and set Microphone to Allow.",
      "Choose Try again.",
    ],
  },
];

function detect(): VoiceBrowser {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && !/Chrom(e|ium)\//.test(ua)) return "safari";
  return "chrome";
}

const noop = () => () => {};

type MicHelpProps = {
  kind: "denied" | "no-mic";
  agentName: string;
  browser?: VoiceBrowser;
  onRetry?: () => void;
  onEnd?: () => void;
};

/** Why the call can't hear you, and how to fix it in the browser you're using. */
export function MicHelp({ kind, agentName, browser, onRetry, onEnd }: MicHelpProps) {
  const titleId = useId();
  const detected = useSyncExternalStore(noop, detect, () => "chrome" as VoiceBrowser);
  const [chosen, setChosen] = useState<VoiceBrowser | null>(null);
  const current = chosen ?? browser ?? detected;
  const guide = BROWSERS.find((b) => b.id === current) ?? BROWSERS[0];
  const denied = kind === "denied";

  return (
    <div className={styles.help} role="group" aria-labelledby={titleId}>
      <span className={styles.helpTile} data-tone={denied ? "danger" : "neutral"} aria-hidden="true">
        <MicGlyph off />
      </span>
      <h4 id={titleId} className={styles.helpTitle}>
        {denied ? "Microphone blocked" : "No microphone found"}
      </h4>
      <p className={styles.helpText}>
        {denied
          ? `Your browser is blocking the microphone for this site, so ${agentName} can’t hear you. Allow it, then try again.`
          : `Plug in a headset or turn your microphone on, then try again. On a laptop, check the mic isn’t switched off in your computer’s sound settings.`}
      </p>

      {denied && (
        <div className={styles.fix}>
          <SegmentedControl aria-label="Your browser" size="sm" value={current} onValueChange={(v) => setChosen(v as VoiceBrowser)}>
            {BROWSERS.map((b) => (
              <Segment key={b.id} value={b.id}>
                {b.name}
              </Segment>
            ))}
          </SegmentedControl>
          <ol className={styles.fixSteps} aria-label={`In ${guide.name}`}>
            {guide.steps.map((step) => (
              <li key={step} className={styles.fixStep}>
                {step}
              </li>
            ))}
          </ol>
          <p className={styles.fixNote}>
            Still blocked? Your computer may be blocking the browser. On a Mac, open System Settings › Privacy &amp; Security › Microphone; on
            Windows, Settings › Privacy &amp; security › Microphone.
          </p>
        </div>
      )}

      <div className={styles.helpActions}>
        {onRetry && (
          <Button size="md" onClick={onRetry}>
            {[<Icon key="i" name="retry" />, <span key="l">Try again</span>]}
          </Button>
        )}
        {onEnd && (
          <Button size="md" variant="ghost" onClick={onEnd}>
            Not now
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- After the call ---------- */

function spokenDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (!m) return `${rest} second${rest === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"}${rest ? ` ${rest} second${rest === 1 ? "" : "s"}` : ""}`;
}

function asText(agentName: string, topic: string | undefined, duration: number, summary: VoiceSummary) {
  const lines = [`Call with ${agentName}${topic ? `: ${topic}` : ""} (${formatCallTime(duration)})`];
  if (summary.decisions.length) lines.push("", "Decided", ...summary.decisions.map((d) => `- ${d}`));
  if (summary.followUps.length)
    lines.push(
      "",
      "Follow-ups",
      ...summary.followUps.map((f) => {
        const who = f.owner === "agent" ? agentName : f.owner === "user" ? "You" : "";
        const meta = [who, f.due].filter(Boolean).join(", ");
        return `- ${f.text}${meta ? ` (${meta})` : ""}`;
      }),
    );
  return lines.join("\n");
}

type SummaryCardProps = {
  agentName: string;
  topic?: string;
  duration: number;
  summary?: VoiceSummary;
  summaryError?: string;
  onRetrySummary?: () => void;
  onCallAgain?: () => void;
  transcript: VoiceTranscriptItem[];
};

/** The call, after: how long, what was decided, what happens next. The transcript folds underneath. */
export function SummaryCard({ agentName, topic, duration, summary, summaryError, onRetrySummary, onCallAgain, transcript }: SummaryCardProps) {
  const titleId = useId();
  const transcriptId = useId();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [showTranscript, setShowTranscript] = useState(false);
  const said = transcript.filter((t) => t.role !== "tool").length;

  async function copy() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(asText(agentName, topic, duration, summary));
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2000);
  }

  const nothing = summary && !summary.decisions.length && !summary.followUps.length;

  return (
    <section className={styles.summary} aria-labelledby={titleId}>
      <header className={styles.summaryHead}>
        <span className={styles.endTile} aria-hidden="true">
          <HangUpGlyph />
        </span>
        <div className={styles.summaryHeading}>
          <h4 id={titleId} className={styles.summaryTitle} tabIndex={-1} data-summary-title>
            Call ended
          </h4>
          <p className={styles.summaryMeta}>
            <time dateTime={`PT${Math.round(duration / 1000)}S`}>
              <span aria-hidden="true">{formatCallTime(duration)}</span>
              <span className={styles.srOnly}>{spokenDuration(duration)}</span>
            </time>{" "}
            with {agentName}
            {topic && <> · {topic}</>}
          </p>
        </div>
      </header>

      <div className={styles.summaryBody} aria-busy={!summary && !summaryError ? true : undefined}>
        {summary ? (
          nothing ? (
            <p className={styles.summaryEmpty}>Nothing was decided on this call.</p>
          ) : (
            <>
              {summary.decisions.length > 0 && (
                <div className={styles.summaryGroup}>
                  <h5 className={styles.groupTitle}>Decided</h5>
                  <ul className={styles.decisions}>
                    {summary.decisions.map((d) => (
                      <li key={d} className={styles.decision}>
                        <Icon name="check" className={styles.decisionIcon} />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.followUps.length > 0 && (
                <div className={styles.summaryGroup}>
                  <h5 className={styles.groupTitle}>Follow-ups</h5>
                  <ul className={styles.followUps}>
                    {summary.followUps.map((f) => (
                      <li key={f.id} className={styles.followUp}>
                        <span className={styles.followText}>{f.text}</span>
                        <span className={styles.followMeta}>
                          {f.owner && (
                            <Badge size="sm" tone={f.owner === "agent" ? "accent" : "neutral"}>
                              {f.owner === "agent" ? agentName : "You"}
                            </Badge>
                          )}
                          {f.due && <span className={styles.followDue}>{f.due}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )
        ) : summaryError ? (
          <div className={styles.summaryFailed} role="alert">
            <p className={styles.summaryFailedText}>{summaryError}</p>
            {onRetrySummary && (
              <Button variant="secondary" onClick={onRetrySummary}>
                {[<Icon key="i" name="retry" />, <span key="l">Try again</span>]}
              </Button>
            )}
          </div>
        ) : (
          <p className={styles.writing}>Writing up the call…</p>
        )}
      </div>

      <footer className={styles.summaryActions}>
        {onCallAgain && (
          <Button size="md" onClick={onCallAgain}>
            {[<Icon key="i" name="mic" />, <span key="l">Call {agentName} again</span>]}
          </Button>
        )}
        {summary && !nothing && (
          <Button size="md" variant="secondary" onClick={copy}>
            {[
              <Icon key="i" name={copied === "copied" ? "check" : "copy"} />,
              <span key="l" className={styles.reserveLabel}>
                {["Copy summary", "Couldn’t copy"].map((r) => (
                  <span key={r} aria-hidden="true" className={styles.reserve}>
                    {r}
                  </span>
                ))}
                <span className={styles.reserveValue}>{copied === "copied" ? "Copied" : copied === "failed" ? "Couldn’t copy" : "Copy summary"}</span>
              </span>,
            ]}
          </Button>
        )}
      </footer>

      {said > 0 && (
        <div className={styles.summaryTranscript}>
          <button
            type="button"
            className={styles.disclosure}
            aria-expanded={showTranscript}
            aria-controls={transcriptId}
            onClick={() => setShowTranscript((v) => !v)}
          >
            <Icon name="chevron-right" data-turn={showTranscript ? "open" : ""} className={styles.disclosureIcon} />
            Transcript
            <span className={styles.disclosureCount}>
              {said} {said === 1 ? "line" : "lines"}
            </span>
          </button>
          <div id={transcriptId} className={styles.fold} data-open={showTranscript || undefined} inert={!showTranscript}>
            <div className={styles.foldInner}>
              <Transcript items={transcript} agentName={agentName} empty="" still />
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
