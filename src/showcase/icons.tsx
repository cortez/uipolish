"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className={styles.row}>
      <Button variant="ghost" aria-label={playing ? "Pause playlist" : "Play playlist"} onClick={() => setPlaying(!playing)}>
        <Icon name={playing ? "pause" : "play"} />
      </Button>
      <Button variant="ghost" aria-label={copied ? "Copied" : "Copy invite link"} onClick={() => setCopied(!copied)}>
        <Icon name={copied ? "check" : "copy"} />
      </Button>
      <Icon name="calendar" aria-hidden="true" />
      <Icon name="clock" aria-hidden="true" />
      <Icon name="share" aria-hidden="true" />
      <Icon name="pencil" aria-hidden="true" />
      <Icon name="settings" aria-hidden="true" />
    </div>
  );
}
