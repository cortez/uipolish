# Voice session

The screen for a live voice call with an agent. In the middle, a disc with
five bars shows who has the floor: the text color for the agent, the accent for
you. A voice lifts the bars smoothly; silence leaves five still dots. Under
it, the agent's state in words (Connecting…, Listening, Thinking, Speaking,
Muted, Reconnecting…) morphs in place without moving anything, with one line
of what that means and, when there's one, a single action: Interrupt while
it talks, Try again when it fails, Cancel when connecting drags. Beside it,
the transcript: your words in a quiet tone while the recognizer may still
change them, settling when they're final; the agent's words appearing as
the voice reaches them; and its lookups inline ("Checking the guest list",
then "Checked the guest list · 14 going"). At the foot: the microphone,
Mute (M), Captions (C) and End call. Hanging up shows a summary: how long,
what was decided, what happens next, and the transcript folded underneath.

```tsx
<VoiceSession
  agentName="Copper"
  topic="Menu for Saturday’s supper · 14 guests"
  status={call.status} // "requesting" | "connecting" | "live" | "reconnecting" | "error" | "denied" | "no-mic" | "ended"
  activity={call.activity} // "listening" | "thinking" | "speaking"
  levels={() => ({ user: micMeter.level(), agent: voiceMeter.level() })}
  muted={muted}
  onMutedChange={(m) => {
    setMuted(m);
    micTrack.enabled = !m;
  }}
  captions={captions}
  onCaptionsChange={setCaptions}
  devices={mics} // from navigator.mediaDevices.enumerateDevices()
  deviceId={micId}
  onDeviceChange={(id) => call.switchMic(id)}
  transcript={call.transcript}
  startedAt={call.startedAt}
  endedAt={call.endedAt}
  error={call.error?.message}
  onInterrupt={() => call.cancelResponse()}
  onEnd={() => call.hangUp()}
  onRetry={() => (call.status === "error" ? call.retry() : call.requestMic())}
  summary={call.summary}
  summaryError={call.summaryError}
  onRetrySummary={() => call.summarize()}
  onCallAgain={() => call.start()}
/>
```

It's controlled and fetches nothing: your realtime client (WebRTC, a
WebSocket to a speech model, a telephony SDK) reports where the call is and
what's been said, and the screen draws it. It fills its container's height;
give it one.

## When to use it

- A spoken conversation with an agent, in the browser: planning, support,
  intake, tutoring, a phone-style assistant.
- When the person needs to see what was heard, what the agent looked up,
  and to cut in, mute or switch microphones mid-call.

## When not to

- One spoken message, sent and then answered in text: that's `voice-input`
  in a composer.
- A text chat that can also speak: use the Chat app template and add a voice button.
- Calls between people. The turn-taking, interruption and lookups here are
  about an agent.

## States

| `status` | Stage | Transcript | Controls |
|---|---|---|---|
| `requesting` | Still dots, "Allow microphone", "Your browser is asking to use the microphone. Choose Allow." | "The transcript starts when the call connects." | Mic, Mute, Captions, End call |
| `connecting` | One slow wave crossing the dots, "Connecting…". After `slowAfter` (6s): "This is taking longer than usual…" and Cancel, which calls `onEnd` | As above | As above |
| `live`, listening | Dots at rest; your voice lifts them in the accent and "You" shows above "Listening" | Your words, quiet until `final` | |
| `live`, thinking | The wave in the text color, "Thinking"; the line under it names the lookup that's running | The lookup, with a turning arc in its icon slot | |
| `live`, speaking | Bars in the text color following the agent's voice, "Speaking", "Start talking to interrupt.", Interrupt | Words appear as `spoken` reaches them | |
| `live`, muted | "Muted", "Copper can’t hear you. Unmute to talk." Your voice no longer moves the bars | | Mute turns red and reads Unmute |
| Barge-in | The moment your voice rises over the agent's, the disc turns to you; when you mark its line `interrupted`, the line ends with an "Interrupted" tag and the stage says "Copper stopped so you can talk." for a few seconds | | |
| `reconnecting` | The wave in amber, "Reconnecting…", "Your connection dropped. The call picks up where it left off." The dot by the timer breathes amber; the timer keeps counting | Holds | All stay; Mute still works |
| Back to `live` | "Reconnected. Nothing was lost." in green for a few seconds | | |
| `error` | Still red dots, "Not responding", `error`, Try again (`onRetry`) | Holds | All stay |
| `denied` | Replaces stage and transcript: "Microphone blocked", steps for Chrome, Safari, Firefox or Edge (the one in use is picked; the others a tap away), where the OS setting lives, Try again and Not now | | Hidden |
| `no-mic` | "No microphone found", what to check, Try again and Not now | | Hidden |
| `ended` | The summary: "Call ended", the duration, Decided, Follow-ups with whose they are, Call again and Copy summary, and the transcript folded underneath. Without `summary`: "Writing up the call…" shimmering (after 300ms) in space held for it. With `summaryError`: the error and Try again | | Hidden; focus moves to "Call ended" |

Nothing on the stage moves between states: the disc, the speaker's name,
the label (every label held in one cell), two lines for the hint and the
action's 40px slot are always there. The timer sits over "88:88" in mono,
so the seconds never nudge the header.

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `agentName` | `string` | `"Assistant"` | Names the call, the speaker and the copy. |
| `agentImage` | `string` | | Its picture; else its initial. |
| `topic` | `string` | | Under the name, and in the summary. Wraps. |
| `status` | `VoiceSessionStatus` | | See States. |
| `activity` | `"listening" \| "thinking" \| "speaking"` | `"listening"` | While `live`. |
| `levels` | `VoiceLevels \| () => VoiceLevels` | | `{ user, agent }`, 0 to 1. A function is read once a frame without re-rendering. |
| `muted`, `onMutedChange` | `boolean`, `(muted) => void` | `false` | Mute shows when `onMutedChange` is passed. M toggles it. |
| `captions`, `onCaptionsChange` | `boolean`, `(on) => void` | `true` | Shows or folds the transcript. C toggles it. |
| `devices` | `VoiceDevice[]` | `[]` | `{ id, label, detail? }`. The picker shows with at least one. |
| `deviceId`, `onDeviceChange` | `string`, `(id) => void` | first device | |
| `transcript` | `VoiceTranscriptItem[]` | | See Transcript. |
| `startedAt`, `endedAt` | `number` | | `Date.now()` at connect and hang-up. Drive the timer and the summary's duration. |
| `error` | `string` | | `error`: what happened and what it means for the call. |
| `slowAfter` | `number` | `6000` | Ms of `connecting` before it says so. |
| `browser` | `"chrome" \| "safari" \| "firefox" \| "edge"` | detected | Which steps show first when blocked. |
| `onInterrupt` | `() => void` | | Stop the agent's reply. |
| `onEnd` | `() => void` | | End call; also Cancel while connecting and Not now. |
| `onRetry` | `() => void` | | Ask for the mic again, or retry after `error`. |
| `summary` | `VoiceSummary` | | `{ decisions: string[], followUps: { id, text, owner?: "agent" \| "user", due? }[] }`. |
| `summaryError`, `onRetrySummary` | `string`, `() => void` | | |
| `onCallAgain` | `() => void` | | |
| `className` | `string` | | |

`formatCallTime(ms)` is exported too: 42000 gives "0:42".

## Transcript

| `role` | Fields | Shows |
|---|---|---|
| `user` | `text`, `final?`, `at?` | Your words. `final: false` sets them in the subtle tone while the recognizer may revise them ("make the gallery"); `final: true` settles them into the text color as they're corrected ("make the galette"). |
| `agent` | `text`, `spoken?`, `interrupted?`, `at?` | Pass the whole reply and how many characters the voice has reached (from your TTS's word or character timings). Each word fades in as it's said. `interrupted` ends the line with an "Interrupted" tag; what was never said stays unsaid. |
| `tool` | `title`, `status`, `detail?`, `at?` | A lookup inline, in a quiet row: a turning arc while `running`, a check or a red "!" after. The title morphs from "Checking…" to "Checked…". |

A name heads each change of speaker, with `at` (ms from the start) as
"0:42". The panel follows the newest line until the reader scrolls up, then
offers "Latest".

## Levels

The visual never invents movement. It eases toward whatever `levels` says,
rising over `--ui-dur-instant` and falling over `--ui-dur-panel`, so it
can't jitter, and each bar sways on its own slow sine so a steady voice
still looks spoken. Silence is still. Feed it RMS from an `AnalyserNode` on
each side:

```ts
function meter(stream: MediaStream) {
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  return () => {
    analyser.getFloatTimeDomainData(buf);
    const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
    return Math.min(1, Math.max(0, (20 * Math.log10(rms || 1e-8) + 55) / 45)); // -55…-10 dBFS
  };
}
```

Who the disc shows: you, while your level is up (held 400ms across gaps
between words, and ignored while muted); else the agent, while `activity`
is `speaking`. You win a tie, so talking over the agent turns the disc to
you at once. Stopping the agent is yours to do (`onInterrupt` or your
client's own voice detection); mark its line `interrupted` and set
`activity` back to `listening`.

## Customizing

- **The agent's color** is `--vs-agent` (and `--vs-agent-text`) on the
  root, the text color by default. Set it to your brand's hue; yours is
  `--vs-user`, the accent.
- **The transcript's width** is `--vs-side` (380px). Under 760px wide the
  transcript goes under the stage; under 560px Mute and Captions fold to
  icon capsules and the microphone takes its own row.
- **Copy.** The labels are short on purpose; the hint line under them is
  where your product's voice goes. The denied steps name each browser's
  real menus; check them against the browsers you support.
- **The summary** is whatever your agent writes after the call. Keep
  decisions to a line each and give follow-ups an owner, so the person
  can see what's theirs.

## Accessibility

- The block is a `section` named "Call with Copper". A polite `role="status"`
  region speaks milestones only: connecting, connected, muted and unmuted,
  captions on and off, the agent stopping, the line dropping and coming
  back, an error, and the call's length when it ends. Never the levels or
  each word: the person can hear the call.
- The transcript is a `role="log"` with `aria-live="off"`, so it doesn't
  talk over the agent; it's focusable and scrolls from the keyboard. Each
  line has its speaker in words, interim lines say "(still listening)", a
  speaking line is `aria-busy`, and lookups say "In progress", "Done" or
  "Failed".
- M and C work anywhere on the page except in a field, menu or picker;
  both buttons carry `aria-keyshortcuts` and show the key in their tooltip.
  Mute names its action ("Mute", "Unmute"); Captions is a toggle with
  `aria-pressed`.
- When the action under the label goes (Interrupt after you interrupt),
  focus that was on it moves to Mute. After hanging up, focus moves to
  "Call ended".
- Who's speaking and every state are in words; color only repeats them.
- With reduced motion the bars don't move: they stay dots and brighten with
  the voice; the waiting wave becomes the dots breathing together; the
  disc doesn't swell; lines fade in without rising.

## Before / after

Before: a pulsing circle and a hang-up button. Nobody can tell whether the
agent heard, what it's doing, or why it went quiet.

```tsx
<div className={speaking ? "orb pulse" : "orb"} />
<button onClick={hangUp}>End</button>
```

After: who's talking, what the agent is doing in words, what was heard and
said, what it looked up, every failure with a way out, and what the call
came to.

```tsx
<VoiceSession
  agentName="Copper"
  status={call.status}
  activity={call.activity}
  levels={readLevels}
  transcript={call.transcript}
  startedAt={call.startedAt}
  muted={muted}
  onMutedChange={setMuted}
  onInterrupt={call.cancelResponse}
  onEnd={call.hangUp}
  summary={call.summary}
/>
```
