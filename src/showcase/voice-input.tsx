"use client";

import { VoiceInput } from "@registry/voice-input/voice-input";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <VoiceInput simulate="allow">
        <span className={styles.voiceIdle}>Record a note for Saturday</span>
      </VoiceInput>
    </div>
  );
}
