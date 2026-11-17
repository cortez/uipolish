# File upload

A drop zone with the files under way listed inside it: receipts, menu
photos, signed forms. Progress is a wash filling each row; a failed
upload keeps its row with the reason and a retry; files of the wrong type
or size are turned away in place, in plain words.

```tsx
<FileUpload
  label="Receipts"
  upload={(file, { signal, onProgress }) => sendWithProgress("/api/receipts", file, { signal, onProgress })}
  accept=".pdf,.jpg,.jpeg,.png"
  acceptLabel="PDF, JPG or PNG"
  maxSize={10_000_000}
  maxFiles={6}
/>
```

## No layout shift

A drop from the desktop isn't input to the browser, so anything it moves
counts as layout shift. The zone has a fixed height (`--upload-height`,
248px) and the list scrolls inside it, so the page never moves. Inside,
every row is one height in every state, and the empty prompt and the
"Add more files" bar are two elements: one leaves and the other appears,
rather than one moving.

## Props

| Prop | What it does |
|---|---|
| `upload(file, { signal, onProgress })` | Sends one file. Call `onProgress(0…1)`; resolve when done, throw an `Error` whose message says what happened to fail it. `signal` aborts on cancel, remove or unmount |
| `accept`, `acceptLabel` | As on a file input, plus plain words for the prompt and the error |
| `maxSize`, `maxFiles` | Checked before uploading: "Too large: 12 MB. Up to 10 MB." Turned-away files don't count toward `maxFiles` |
| `onChange(items)` | Every change: `{ id, file, status, progress, error }` |
| `disabled` | |

## States

| Row | What you see |
|---|---|
| Uploading | The extension on a badge, "42% of 240 KB", a wash filling the row on the move spring |
| Done | A check on the badge, "Uploaded, 240 KB", the wash finishing its run, then fading |
| Failed | The badge and reason in the danger color, the wash stopped where it failed, a retry button |
| Turned away | The badge and reason in the danger color, the whole row tinted |

## Pointer states

| State | What you see |
|---|---|
| Hover, empty | The well's edge darkens a step, as a field's does. No fill |
| Hover, "Add more files" | The text and plus come up to the text color, like a row |
| Press | Nothing of its own: the system picker opening is the answer, and a well this size shrinking on press reads as the page moving |
| File held over the zone | The one state meant to read from across the screen: the edge takes the focused field's color, the well tints a step, the prompt comes up to the text color and says "Drop to add" |
| Focus | A line just inside the well, instantly |

Every change is color only, on `--ui-dur-instant`, in both directions. Removing a row fades it, then closes its
height once it's gone (an answer to a press, so the rows below may move,
but never while the row is still showing).

## Keyboard and screen readers

The prompt is one button, named "Receipts, Drop files here or browse" and
described by the limits; it opens the system picker. Each row has
"Cancel", "Retry" and "Remove" buttons named with the file. Completions,
failures and turned-away files are announced in a polite live region.
Long names are cut with the text fade, with the full name in a tooltip.
Under `prefers-reduced-motion` rows appear and go at once.
