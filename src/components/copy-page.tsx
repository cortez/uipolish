"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import { TextMorph } from "@registry/text-morph/text-morph";
import styles from "./install-command.module.css";
import { copyText } from "@registry/text/copy-text";

/** Copies the page as Markdown, from its twin at /md/<path>, to paste into
 *  an agent or a note. */
export function CopyPage() {
  const path = usePathname();
  const [state, setState] = useState<"idle" | "copied" | "blocked">("idle");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Fetched when a click is likely (pointer over the button, or focus on
  // it), not with every page view, so a click usually copies text already in
  // hand and the label changes on the click itself.
  const ready = useRef<{ path: string; text: string } | null>(null);
  const warming = useRef<string | null>(null);
  function warm() {
    if (ready.current?.path === path || warming.current === path) return;
    warming.current = path;
    fetch(`/md${path}`)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (text !== null) ready.current = { path, text };
      })
      .catch(() => {})
      .finally(() => {
        if (warming.current === path) warming.current = null;
      });
  }

  function show(next: typeof state) {
    setState(next);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  }

  async function copy() {
    const cached = ready.current?.path === path ? ready.current.text : null;
    if (cached !== null) {
      show((await copyText(cached)) ? "copied" : "blocked");
      return;
    }
    // Not fetched yet (a click straight after arriving): fetch it now.
    const markdown = () =>
      fetch(`/md${path}`).then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      });
    let next: typeof state = "copied";
    try {
      // Safari only allows a write that starts inside the click, so the
      // clipboard is handed the pending text rather than waiting for it.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const blob = markdown().then((text) => new Blob([text], { type: "text/plain" }));
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      } else if (!(await copyText(await markdown()))) {
        throw new Error("Couldn’t copy");
      }
    } catch {
      // Refused (an in-app browser): try once more the older way.
      next = (await copyText(await markdown().catch(() => ""))) ? "copied" : "blocked";
    }
    show(next);
  }

  return (
    <Button variant="secondary" onClick={copy} onPointerEnter={warm} onFocus={warm}>
      <Icon name={state === "copied" ? "check" : "copy"} />
      <TextMorph>{state === "copied" ? "Copied" : state === "blocked" ? "Couldn’t copy" : "Copy page"}</TextMorph>
      <span role="status" className={styles.srOnly}>
        {state === "copied" ? "Page copied as Markdown" : state === "blocked" ? `Couldn’t copy. The page is at /md${path}.` : ""}
      </span>
    </Button>
  );
}
