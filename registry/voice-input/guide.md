# Voice input

A mic button that records a voice message. Pressing it opens the button's
own circle out into a recording bar that fills the row: Cancel, a waveform
that scrolls smoothly as you speak, the elapsed time, and the mic turned
into Stop in place. It asks for permission without flashing anything when
the answer is quick, and says plainly what to do when the microphone is
blocked. Native APIs only: `getUserMedia`, an `AnalyserNode` for the level
and `MediaRecorder` for the audio.

```tsx
<VoiceInput onComplete={({ blob, duration }) => transcribe(blob)} onDiscard={clearClip}>
  <span style={{ paddingInlineStart: "var(--voice-inset)" }}>Record a note for the book club</span>
</VoiceInput>
```

## When to use it

- Dictating a message to an assistant, in a composer toolbar or its own row.
- Short voice notes the app sends or transcribes.

## When not to

- Live, continuous conversation: that needs streaming audio and turn-taking,
  not a record-then-send control.
- Long recordings with pause and resume, or editing: use a dedicated
  recorder.

## States

Every state fits the same 32px row. The states share one grid cell and
crossfade where they are; the mic button never moves. Text in the row starts
at `--voice-inset` (10px: a 16px gutter when the row sits 6px inside its
container); give your idle `children` the same inset.

| State | What you see | How |
|---|---|---|
| Idle | Your `children` and a mic button | |
| Waiting for permission | After 300ms, "Waiting for microphone permission…" with a light band passing across it; the mic shows a fill and ignores presses. If permission comes back sooner, nothing flashes | `aria-busy` |
| Recording | A bar the full width of the row, opened out of the mic's circle: Cancel, the waveform, a red dot breathing slowly before m:ss (live, at a glance); the mic becomes a filled Stop button at the bar's end | `data-status="recording"` |
| Done | The same bar, waveform held still at 40%, the red dot gone (its space kept) and the time muted; Cancel becomes Discard (the cross turns into a bin) and Stop becomes the mic again (record again) | `onComplete` |
| Blocked | "Microphone blocked. Allow it in site settings, then try again." The mic tries again | `NotAllowedError` |
| No microphone | "No microphone found. Connect one, then try again." | `NotFoundError` |
| Not secure | "Voice input needs a secure (https) page." | no `isSecureContext` |

Recording and done are one layer, so Cancel, the waveform and the time stay
exactly where they were when recording stops; only the waveform's tone, the
time's color and the buttons change.

**The bar.** One pill behind the row, clipped to the mic's 34px circle at
rest. Recording opens the clip to the whole row; its ends are the 32px
buttons' circles, so they're concentric (and 6px padding in a 22px
container keeps the container concentric too). The bar's contents are
clipped from the same side on the same curve, so nothing shows outside the
bar while it grows. `clip-path` only: nothing lays out.

**The waveform.** A canvas, so it never touches layout. Samples land on a
fixed 60ms grid and every bar is drawn at its age, so the row slides left
continuously instead of stepping a bar at a time, snapped to device pixels
so bars stay crisp. Each new bar grows from a dot to its level over 140ms.
Bars are 2px on a 4px pitch. Where there's no sound yet, faint dots hold
the line; a voice comes up in full ink. The far end fades out with a mask.
The level is the RMS of the input, mapped over the range a voice uses (−55
to −10 dBFS) on a curve, so quiet syllables draw short bars and loud ones
tall: the waveform has the rhythm of speech, not a wall of full bars. It
rises fast and falls quickly enough that the dips between syllables show.

**The time.** m:ss in tabular figures, as wide as the longest time
`maxDuration` allows, so nothing gives up room as minutes grow. It's a
`TextMorph`, so only the figure that changes moves.

**Simulated microphone.** `simulate="allow"` skips the permission prompt and
generates a speech-like level; `simulate="deny"` behaves as if the user
blocked the microphone. Use them for demos, tests and screenshots.

`maxDuration` (seconds, default 300) stops the recording on its own.

## Keyboard

| Key | Does |
|---|---|
| Enter, Space on the mic | Start, stop, record again, or try again |
| Escape while recording or waiting | Cancel; focus moves to the mic |

## Motion

| What | Duration | Easing |
|---|---|---|
| Bar opens out of the mic's circle (and its contents are uncovered) | `--ui-dur-panel` | `--ui-ease-expand` |
| Bar closes back into the button, fading as it lands | `--ui-dur-base` | `--ui-ease-collapse` |
| A figure of the time changes | from `TextMorph` | |
| Mic strokes retract, stop block sweeps in (and back) | out `--ui-dur-fast`, in `--ui-dur-base` after 60ms | `--ui-ease-draw` |
| Stop button fill | `--ui-dur-instant` | `--ui-ease-color` |
| States crossfade | in `--ui-dur-fast`, out `--ui-dur-instant` | `--ui-ease-enter` / `--ui-ease-exit` |
| Waiting line appears | after 300ms, `--ui-dur-fast` | `--ui-ease-enter` |
| Light band on the waiting line | `--ui-dur-sweep` per pass | `linear` |
| Press | 0ms in, `--ui-dur-snap` back; only the fill shrinks | `--ui-ease-snap` |

The waveform moves because the voice does; nothing else loops. Under
`prefers-reduced-motion: reduce` states switch at once, the bar appears
without opening, the waveform steps instead of sliding and bars appear at
full height, the band holds still, and the mic and stop swap without
drawing.

## Accessibility

- The one button's name follows the state: "Record a voice message", "Stop
  recording", "Record again", "Try the microphone again".
- Starting, stopping (with the length: "Recording stopped. 7 seconds."),
  canceling and every error are announced in a `role="status"` region. The
  ticking time isn't announced each second.
- Hidden states are `inert`, so their buttons leave the tab order.
- 40px hit areas on coarse pointers.

## Before / after

Before: a mic button that toggles a red dot. A blocked microphone does
nothing visible, and a spinner flashes even when permission was already
granted.

```tsx
<button onClick={toggle}>{recording ? <RedDot /> : <Mic />}</button>
{asking && <Spinner />}
```

After:

```tsx
<VoiceInput onComplete={send} />
```
