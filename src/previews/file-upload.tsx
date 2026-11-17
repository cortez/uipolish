"use client";

import { FileUpload } from "@registry/file-upload/file-upload";
import base from "./preview.module.css";

let attempts = 0;

/* Stands in for a real upload: progress in steps, and every third upload
   fails its first try so the retry can be seen. */
function fakeUpload(file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (f: number) => void }) {
  const fails = ++attempts % 3 === 0;
  return new Promise<void>((resolve, reject) => {
    let done = 0;
    const timer = setInterval(() => {
      done = Math.min(1, done + 0.08 + Math.random() * 0.12);
      onProgress(done);
      if (fails && done > 0.55) {
        clearInterval(timer);
        reject(new Error("The connection dropped."));
      } else if (done >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 220);
    signal.addEventListener("abort", () => clearInterval(timer));
  });
}

export function FileUploadPreview() {
  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>Shared groceries</h2>
        <FileUpload
          label="Receipts"
          upload={fakeUpload}
          accept=".pdf,.jpg,.jpeg,.png"
          acceptLabel="PDF, JPG or PNG"
          maxSize={10_000_000}
          maxFiles={6}
        />
      </form>
    </div>
  );
}
