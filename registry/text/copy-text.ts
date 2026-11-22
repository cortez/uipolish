/** Puts text on the clipboard and says whether it got there.
 *
 *  The Clipboard API first. Where it's missing or refused (an in-app
 *  browser such as a social app's, a page that isn't served securely, a
 *  denied permission), a hidden, read-only textarea is selected and copied
 *  with `execCommand("copy")`, which those browsers still honour inside a
 *  tap. Call it straight from the click or tap, before awaiting anything
 *  else: both ways need the press to still count as the reason.
 *
 *  Resolves `false` only when neither worked, so the control can say so
 *  and select the text for copying by hand. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Refused: try the older way below.
    }
  }
  return copyWithSelection(text);
}

function copyWithSelection(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  // Read-only and 16px, so iOS neither raises the keyboard nor zooms; fixed
  // and transparent, so nothing scrolls or shows.
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  area.tabIndex = -1;
  Object.assign(area.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    fontSize: "16px",
    pointerEvents: "none",
  });
  const focused = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i)) : [];
  document.body.appendChild(area);
  area.focus({ preventScroll: true });
  area.select();
  area.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  // Put focus and any selection back where they were.
  focused?.focus?.({ preventScroll: true });
  if (selection) {
    selection.removeAllRanges();
    ranges.forEach((r) => selection.addRange(r));
  }
  return copied;
}
