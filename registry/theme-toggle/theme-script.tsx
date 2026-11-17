/*
 * No "use client": this renders on the server, in <head>, so the stored theme
 * is on <html> before the first paint. A client component would render a
 * <script> React never runs, and React warns about it.
 */

/** Where the chosen theme is kept in localStorage, unless you pass another key. */
export const THEME_STORAGE_KEY = "theme";

/**
 * The inline script as a string, for frameworks that take one. It sets
 * `data-theme` on <html> to "light" or "dark": the stored choice, or the
 * system's when there is none, and follows the system while it is "system".
 */
export function themeScript(storageKey: string = THEME_STORAGE_KEY) {
  return `(function(k){var d=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)");function a(){var m;try{m=localStorage.getItem(k)}catch(e){}d.dataset.theme=m==="light"||m==="dark"?m:q.matches?"dark":"light"}a();q.addEventListener("change",a)})(${JSON.stringify(storageKey)})`;
}

/** Put in <head>, before anything that paints. */
export function ThemeScript({ storageKey = THEME_STORAGE_KEY, nonce }: { storageKey?: string; nonce?: string }) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript(storageKey) }} />;
}
