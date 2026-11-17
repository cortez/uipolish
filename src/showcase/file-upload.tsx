"use client";

import { FileUpload } from "@registry/file-upload/file-upload";
import styles from "./showcase.module.css";

// Stands in for a real upload: reports progress, then finishes.
function upload(_file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (f: number) => void }) {
  return new Promise<void>((resolve, reject) => {
    let done = 0;
    const timer = setInterval(() => {
      done = Math.min(1, done + 0.15);
      onProgress(done);
      if (done >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
    signal.addEventListener("abort", () => {
      clearInterval(timer);
      reject(signal.reason);
    });
  });
}

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <FileUpload label="Receipts" upload={upload} accept=".pdf,.jpg,.jpeg,.png" acceptLabel="PDF, JPG or PNG" maxSize={10_000_000} maxFiles={6} />
    </div>
  );
}
