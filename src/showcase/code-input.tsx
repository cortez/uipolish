"use client";

import { useEffect, useState } from "react";
import { CodeInput, type CodeInputStatus } from "@registry/code-input/code-input";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<CodeInputStatus>("idle");
  useEffect(() => {
    if (status !== "verifying") return;
    const t = window.setTimeout(() => setStatus(code === "000000" ? "error" : "success"), 900);
    return () => window.clearTimeout(t);
  }, [status, code]);
  return (
    <div className={styles.stack}>
      <CodeInput
        label="Verification code"
        hint="We sent it to the number on your RSVP."
        value={code}
        onValueChange={(next) => {
          setCode(next);
          if (status !== "verifying") setStatus("idle");
        }}
        status={status}
        onComplete={() => setStatus("verifying")}
      />
    </div>
  );
}
