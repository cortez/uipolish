import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// The home page's showcases: each component itself, live, with nothing
// around it. One file per component in this folder; each loads only when
// its card nears the screen.

export const SHOWCASES: Record<string, ComponentType> = {
  "accordion": dynamic(() => import("./accordion")),
  "alert": dynamic(() => import("./alert")),
  "animated-size": dynamic(() => import("./animated-size")),
  "avatar": dynamic(() => import("./avatar")),
  "badge": dynamic(() => import("./badge")),
  "breadcrumbs": dynamic(() => import("./breadcrumbs")),
  "button": dynamic(() => import("./button")),
  "checkbox": dynamic(() => import("./checkbox")),
  "chip": dynamic(() => import("./chip")),
  "code-block": dynamic(() => import("./code-block")),
  "code-input": dynamic(() => import("./code-input")),
  "combobox": dynamic(() => import("./combobox")),
  "command-palette": dynamic(() => import("./command-palette")),
  "copy-field": dynamic(() => import("./copy-field")),
  "data-table": dynamic(() => import("./data-table")),
  "date-picker": dynamic(() => import("./date-picker")),
  "dialog": dynamic(() => import("./dialog")),
  "diff-view": dynamic(() => import("./diff-view")),
  "drawer": dynamic(() => import("./drawer")),
  "dropdown-menu": dynamic(() => import("./dropdown-menu")),
  "empty-state": dynamic(() => import("./empty-state")),
  "field": dynamic(() => import("./field")),
  "file-upload": dynamic(() => import("./file-upload")),
  "icons": dynamic(() => import("./icons")),
  "inline-edit": dynamic(() => import("./inline-edit")),
  "kbd": dynamic(() => import("./kbd")),
  "list": dynamic(() => import("./list")),
  "markdown": dynamic(() => import("./markdown")),
  "message-thread": dynamic(() => import("./message-thread")),
  "model-picker": dynamic(() => import("./model-picker")),
  "nav-rail": dynamic(() => import("./nav-rail")),
  "number-input": dynamic(() => import("./number-input")),
  "pagination": dynamic(() => import("./pagination")),
  "popover": dynamic(() => import("./popover")),
  "progress": dynamic(() => import("./progress")),
  "prompt-input": dynamic(() => import("./prompt-input")),
  "radio-group": dynamic(() => import("./radio-group")),
  "reasoning": dynamic(() => import("./reasoning")),
  "response-actions": dynamic(() => import("./response-actions")),
  "scroll-area": dynamic(() => import("./scroll-area")),
  "search-field": dynamic(() => import("./search-field")),
  "segmented-control": dynamic(() => import("./segmented-control")),
  "select": dynamic(() => import("./select")),
  "sidebar": dynamic(() => import("./sidebar")),
  "skeleton": dynamic(() => import("./skeleton")),
  "slider": dynamic(() => import("./slider")),
  "switch": dynamic(() => import("./switch")),
  "tabs": dynamic(() => import("./tabs")),
  "text": dynamic(() => import("./text")),
  "text-field": dynamic(() => import("./text-field")),
  "text-morph": dynamic(() => import("./text-morph")),
  "theme-toggle": dynamic(() => import("./theme-toggle")),
  "toast": dynamic(() => import("./toast")),
  "tool-steps": dynamic(() => import("./tool-steps")),
  "tooltip": dynamic(() => import("./tooltip")),
  "usage-meter": dynamic(() => import("./usage-meter")),
};

/** Components that are already a box of their own: on the home page they
 *  are the card, with no edge or padding around them. */
export const BLEED = new Set(["code-block", "data-table", "diff-view", "file-upload"]);
