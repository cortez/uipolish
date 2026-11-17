"use client";

import { useEffect, useMemo, useState } from "react";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { VoiceInput, type VoiceRecording } from "@registry/voice-input/voice-input";
import base from "./preview.module.css";
import styles from "./voice-input.module.css";

const MODES = [
  { id: "allow", label: "Simulated" },
  { id: "deny", label: "Blocked" },
  { id: "real", label: "Your mic" },
] as const;

type Mode = (typeof MODES)[number]["id"];

function seconds(ms: number) {
  // Floored, like the timer in the bar, so the two always agree.
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceInputPreview() {
  const [mode, setMode] = useState<Mode>("allow");
  const [clip, setClip] = useState<VoiceRecording | null>(null);
  const url = useMemo(() => (clip?.blob ? URL.createObjectURL(clip.blob) : null), [clip]);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Voice message</h2>
        <SegmentedControl
            size="sm"
          aria-label="Microphone"
          widths="content"
          className={styles.modes}
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setClip(null);
          }}
        >
          {MODES.map((m) => (
            <Segment key={m.id} value={m.id}>
              {m.label}
            </Segment>
          ))}
        </SegmentedControl>

        <div className={styles.composer}>
          <VoiceInput
            key={mode}
            simulate={mode === "real" ? undefined : mode}
            onComplete={setClip}
            onDiscard={() => setClip(null)}
          >
            <span className={styles.idle}>Record a note for the book club: what to bring Friday</span>
          </VoiceInput>
        </div>

        {/* Same height whether or not there's a clip, so nothing below moves. */}
        <div className={styles.result}>
          {clip && url ? (
            <audio className={styles.audio} src={url} controls />
          ) : (
            <p className={base.note}>
              {clip ? `Recorded ${seconds(clip.duration)}. A simulated mic has no audio to play.` : "No recording yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
