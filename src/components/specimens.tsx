"use client";

import Link from "@/components/link";
import { createContext, use, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Accordion, AccordionItem } from "@registry/accordion/accordion";
import { Alert } from "@registry/alert/alert";
import { Connections, type Connection } from "@registry/connections/connections";
import { ToolApproval, type ToolApprovalStatus } from "@registry/tool-approval/tool-approval";
import { UsageBreakdown } from "@registry/usage-meter/usage-meter";
import { Authorize, type AuthorizeScope, type AuthorizeStatus } from "@registry/authorize/authorize";
import { Button } from "@registry/button/button";
import { CodeInput } from "@registry/code-input/code-input";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Chip, ChipGroup } from "@registry/chip/chip";
import { CodeBlock } from "@registry/code-block/code-block";
import { Combobox, type ComboboxOption } from "@registry/combobox/combobox";
import { CommandPalette, type Command } from "@registry/command-palette/command-palette";
import { DataTable, type DataTableColumn } from "@registry/data-table/data-table";
import { DatePicker } from "@registry/date-picker/date-picker";
import { ConfirmDialog } from "@registry/dialog/dialog";
import { DiffView } from "@registry/diff-view/diff-view";
import { Drawer, DrawerActions } from "@registry/drawer/drawer";
import { EmptyState } from "@registry/empty-state/empty-state";
import { FileUpload } from "@registry/file-upload/file-upload";
import { DropdownMenu, MenuItem, MenuSeparator } from "@registry/dropdown-menu/dropdown-menu";
import { Icon } from "@registry/icons/icons";
import { Message, MessageThread } from "@registry/message-thread/message-thread";
import { StreamingText } from "@registry/message-thread/streaming-text";
import { ModelPicker, type ModelOption } from "@registry/model-picker/model-picker";
import { NumberInput } from "@registry/number-input/number-input";
import { PhoneInput } from "@registry/phone-input/phone-input";
import { Popover } from "@registry/popover/popover";
import { Progress, ProgressSteps } from "@registry/progress/progress";
import { PromptInput } from "@registry/prompt-input/prompt-input";
import { RadioGroup } from "@registry/radio-group/radio-group";
import { Reasoning } from "@registry/reasoning/reasoning";
import { ResponseActions } from "@registry/response-actions/response-actions";
import { Segment, SegmentedControl } from "@registry/segmented-control/segmented-control";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { Select, type SelectOption } from "@registry/select/select";
import { Slider } from "@registry/slider/slider";
import { Citation, SourceList, Sources, type Source } from "@registry/sources/sources";
import { Stat } from "@registry/stat/stat";
import { Switch } from "@registry/switch/switch";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@registry/tabs/tabs";
import { TextField } from "@registry/text-field/text-field";
import { Toaster, toast } from "@registry/toast/toast";
import { ToolSteps, type ToolStep } from "@registry/tool-steps/tool-steps";
import { Tooltip } from "@registry/tooltip/tooltip";
import { VoiceInput } from "@registry/voice-input/voice-input";
import styles from "./specimens.module.css";

// True while a tile is on screen and nobody is hovering or focused inside it,
// and never with reduced motion. Tiles only animate on their own while true.
// Once someone presses or types in a tile it's theirs, and it stops for
// good: a tap leaves no hover or focus behind on a phone, so the loop would
// otherwise carry on changing what they just set.
const Playing = createContext(false);

// The pause button under the grid stops every tile at once (WCAG 2.2.2:
// movement that runs on its own longer than five seconds can be paused).
const Paused = createContext(false);

function usePlaying(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [still, setStill] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [used, setUsed] = useState(false);

  // Every listener, observer and timer is released on cleanup, so StrictMode's
  // double mount and client-side navigation leave nothing behind.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setStill(motion.matches);
    const syncPage = () => setHidden(document.hidden);
    syncMotion();
    syncPage();
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncPage);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    let frame = 0;
    const enter = () => setBusy(true);
    // Checked a frame later: focus moving between two controls in the tile
    // passes through the body for a moment.
    const leave = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setBusy(el.matches(":hover") || el.contains(document.activeElement)));
    };
    const use = () => setUsed(true);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", enter);
    el.addEventListener("focusout", leave);
    el.addEventListener("pointerdown", use);
    el.addEventListener("keydown", use);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncPage);
      io.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", enter);
      el.removeEventListener("focusout", leave);
      el.removeEventListener("pointerdown", use);
      el.removeEventListener("keydown", use);
    };
  }, [ref]);

  return visible && !busy && !used && !still && !hidden;
}

/** Calls `step` every `ms` while the tile is playing. */
function useLoop(step: () => void, ms: number) {
  const playing = use(Playing);
  const saved = useRef(step);
  useEffect(() => {
    saved.current = step;
  });
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => saved.current(), ms);
    return () => clearInterval(t);
  }, [playing, ms]);
}

/** A fixed-size tile: the component lives inside, the name sits in the corner. */
function Tile({ name, title, height, kit, children }: { name: string; title: string; height: number; kit: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const paused = use(Paused);
  const playing = usePlaying(ref) && !paused;
  return (
    <figure ref={ref} data-tile="" className={styles.tile} style={{ height }}>
        <div className={styles.stage}>
          <Playing value={playing}>{children}</Playing>
        </div>
        <figcaption className={styles.caption}>
          <Link href={`/docs/${name}`}>{title}</Link>
          {kit && <span className={styles.kit}>Agent kit</span>}
        </figcaption>
    </figure>
  );
}

const REPLY =
  "Slow-roast a pork shoulder from late morning and serve it with smashed potatoes and a big green salad. Start with burrata and roasted grapes. Your sister’s lemon tart covers dessert.";

const QUESTION = "Plan a dinner for my book club";

function Chat() {
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState<string | null>(QUESTION);
  const [reply, setReply] = useState(REPLY);
  const [streaming, setStreaming] = useState(false);
  const [rest, setRest] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => clearInterval(timer.current), []);

  function ask(text: string) {
    clearInterval(timer.current);
    setDraft("");
    setQuestion(text);
    setReply("");
    setStreaming(true);
    const words = REPLY.split(" ");
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setReply(words.slice(0, i).join(" "));
      if (i >= words.length) {
        clearInterval(timer.current);
        setStreaming(false);
        setRest(0);
      }
    }, 55);
  }

  function stop() {
    clearInterval(timer.current);
    setStreaming(false);
  }

  // On its own: type the question a few letters at a time, send it, let the
  // reply finish, rest, then clear and start over.
  useLoop(() => {
    if (streaming) return;
    if (question !== null) {
      if (rest < 50) setRest((r) => r + 1);
      else {
        setQuestion(null);
        setReply("");
      }
      return;
    }
    if (draft.length < QUESTION.length) setDraft(QUESTION.slice(0, draft.length + 1));
    else ask(QUESTION);
  }, 70);

  return (
    <div className={styles.chat}>
      <div className={styles.thread}>
        {question !== null && (
          <>
            <p className={styles.user}>{question}</p>
            <div>
              <StreamingText text={reply} streaming={streaming} />
            </div>
          </>
        )}
      </div>
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={({ text }) => ask(text)}
        streaming={streaming}
        onStop={stop}
        placeholder="Ask about the dinner…"
        label="Message"
        hint={false}
      />
    </div>
  );
}

const THOUGHT =
  "Everyone eats around the same amount at a sit-down dinner, so scale by guests.\n\nTwo are vegetarian: the burrata starter works for them, and the potatoes and salad can be the main with an extra side.";

const ANSWER = "Plan for everyone eating the same, with the potatoes and salad doubling as the vegetarian main.";

/** Ticks of 90ms between runs: long enough to read the answer. */
const REST = 40;

function Thinking() {
  const [run, setRun] = useState(0);
  const thought = THOUGHT.split(" ");
  const answer = ANSWER.split(" ");
  // Starts finished, so the tile reads well before it ever plays, and its
  // rest nearly over, so the first run starts about a second after the tile
  // comes into view instead of after a whole pause.
  const [words, setWords] = useState(thought.length + answer.length);
  const [rest, setRest] = useState(REST - 11);
  const thinking = words < thought.length;
  const answering = !thinking && words < thought.length + answer.length;

  useLoop(() => {
    if (thinking || answering) setWords((w) => w + 1);
    else if (rest < REST) setRest((r) => r + 1);
    else {
      setRest(0);
      setWords(0);
      setRun((r) => r + 1);
    }
  }, 90);

  return (
    <div className={styles.thinking}>
      <Reasoning
        key={run}
        streaming={thinking}
        steps={words === 0 ? undefined : words < thought.length / 2 ? ["Scaling by guests"] : ["Scaling by guests", "Checking the vegetarians"]}
      >
        {thought.slice(0, words).join(" ")}
      </Reasoning>
      <div className={styles.answer}>
        <StreamingText text={answer.slice(0, Math.max(0, words - thought.length)).join(" ")} streaming={answering} />
      </div>
    </div>
  );
}

function Confirm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  useLoop(() => setState((s) => (s === "idle" ? "busy" : s)), 3600);
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState(state === "busy" ? "done" : "idle"), state === "busy" ? 1200 : 2200);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <div className={styles.center}>
      <Button busy={state === "busy"} onClick={() => state === "idle" && setState("busy")}>
        {state === "done" ? "Confirmed" : "Confirm"}
      </Button>
    </div>
  );
}

function Password() {
  const ref = useRef<HTMLDivElement>(null);
  // While the tile plays, press the reveal button now and then so the eye's
  // slash draws and retracts. A programmatic click doesn't move focus.
  useLoop(() => ref.current?.querySelector<HTMLButtonElement>("button[aria-pressed]")?.click(), 2400);
  return (
    <div ref={ref} className={styles.field}>
      <TextField label="Password" type="password" defaultValue="tuesday-lemon-tart" hint="At least 12 characters." autoComplete="new-password" />
    </div>
  );
}

const PLAN = [
  { id: "read", running: "Reading the guest list", done: "Read the guest list", detail: "guests.csv", ms: 900 },
  { id: "diet", running: "Checking who’s vegetarian", done: "Checked who’s vegetarian", detail: "Two guests", ms: 1300 },
  { id: "list", running: "Writing the shopping list", done: "Wrote the shopping list", detail: "shopping-list.md", ms: 1600 },
];

function Steps() {
  const [run, setRun] = useState(0);
  const [steps, setSteps] = useState<ToolStep[]>(() => {
    let t = 1_700_000_000_000;
    return PLAN.map((p) => ({ id: p.id, title: p.done, detail: p.detail, status: "done", startedAt: t, finishedAt: (t += p.ms) }));
  });
  const [rest, setRest] = useState(0);

  useLoop(() => {
    const now = Date.now();
    const i = steps.findIndex((s) => s.status !== "done");
    if (i === -1) {
      if (rest < 30) return setRest((r) => r + 1);
      setRest(0);
      setRun((r) => r + 1);
      setSteps(PLAN.map((p) => ({ id: p.id, title: p.running, detail: p.detail, status: "pending" })));
      return;
    }
    const step = steps[i];
    const plan = PLAN[i];
    if (step.status === "pending") {
      setSteps(steps.map((s, j) => (j === i ? { ...s, status: "running", startedAt: now } : s)));
    } else if (now - (step.startedAt ?? now) >= plan.ms) {
      setSteps(steps.map((s, j) => (j === i ? { ...s, status: "done", title: plan.done, finishedAt: now } : s)));
    }
  }, 200);

  return <ToolSteps key={run} steps={steps} defaultOpen label="Dinner prep steps" className={styles.steps} />;
}

const SOURCES: Source[] = [
  {
    title: "Roasting times for pork shoulder",
    url: "https://cooking.example.org/pork-shoulder",
    excerpt: "Plan on about an hour per kilo at a low oven, then rest it while the potatoes crisp.",
  },
  {
    title: "How much salad per person",
    url: "https://kitchen.example.com/salad-portions",
    excerpt: "A side salad needs a generous handful of leaves for each guest.",
  },
];

function Cited() {
  return (
    <Sources sources={SOURCES}>
      <div className={styles.cited}>
        <p>
          Give the pork the whole afternoon
          <Citation n={1} /> and buy a handful of leaves per guest
          <Citation n={2} />.
        </p>
        <SourceList variant="row" />
      </div>
    </Sources>
  );
}

const CODE = `export function scale(recipe: Recipe, guests: number) {
  return recipe.items.map((item) => ({
    ...item,
    amount: item.perPerson * guests,
  }));
}`;

function Code() {
  const [chars, setChars] = useState(CODE.length);
  const [rest, setRest] = useState(0);
  const streaming = chars < CODE.length;
  useLoop(() => {
    if (streaming) setChars((c) => Math.min(CODE.length, c + 4));
    else if (rest < 120) setRest((r) => r + 1);
    else {
      setRest(0);
      setChars(0);
    }
  }, 40);
  return <CodeBlock code={CODE.slice(0, chars)} language="ts" title="scale.ts" streaming={streaming} className={styles.code} />;
}

const TABS = ["menu", "shopping", "timing"];

function Plan() {
  const [tab, setTab] = useState("menu");
  useLoop(() => setTab((t) => TABS[(TABS.indexOf(t) + 1) % TABS.length]), 2600);
  return (
    <Tabs value={tab} onValueChange={setTab} crossfade className={styles.tabs}>
      <TabList aria-label="Dinner plan">
        <Tab value="menu">Menu</Tab>
        <Tab value="shopping">Shopping</Tab>
        <Tab value="timing">Timing</Tab>
      </TabList>
      <TabPanels className={styles.panels}>
        <TabPanel value="menu">Burrata, slow-roast pork, smashed potatoes, lemon tart.</TabPanel>
        <TabPanel value="shopping">Butcher on Thursday, everything else Friday morning.</TabPanel>
        <TabPanel value="timing">Pork in before lunch, potatoes once guests arrive.</TabPanel>
      </TabPanels>
    </Tabs>
  );
}

function Hints() {
  return (
    <div className={styles.center}>
      <div className={styles.toolbar}>
        <Tooltip content="Copy link" kbd="⌘C" describe={false}>
          <Button variant="ghost" className={styles.icon} aria-label="Copy link">
            <Icon name="link" />
          </Button>
        </Tooltip>
        <Tooltip content="Download menu" describe={false}>
          <Button variant="ghost" className={styles.icon} aria-label="Download menu">
            <Icon name="download" />
          </Button>
        </Tooltip>
        <Tooltip content="Duplicate plan" describe={false}>
          <Button variant="ghost" className={styles.icon} aria-label="Duplicate plan">
            <Icon name="duplicate" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

function Actions() {
  return (
    <div className={styles.center}>
      <DropdownMenu
        trigger={
          <Button variant="secondary">
            Plan actions
          </Button>
        }
      >
        <MenuItem icon={<Icon name="duplicate" />} onSelect={() => toast.success("Plan duplicated")}>
          Duplicate
        </MenuItem>
        <MenuItem icon={<Icon name="link" />} onSelect={() => toast("Link copied")}>
          Copy link
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          variant="danger"
          icon={<Icon name="trash" />}
          onSelect={() => toast("Plan deleted", { action: { label: "Undo", onClick: () => toast.success("Plan restored") } })}
        >
          Delete
        </MenuItem>
      </DropdownMenu>
    </div>
  );
}

const FOLLOW_UP = "Two more friends can come. Does the plan still work?";
const FOLLOW_REPLY =
  "It does. The pork already feeds ten, so add a second tray of potatoes and one more burrata.";

function Thread() {
  const words = FOLLOW_REPLY.split(" ");
  // Starts finished, then replays the reply while the tile is on screen.
  const [count, setCount] = useState(words.length);
  const [run, setRun] = useState(0);
  const [rest, setRest] = useState(0);
  const streaming = count < words.length;
  useLoop(() => {
    if (streaming) setCount((c) => c + 1);
    else if (rest < 70) setRest((r) => r + 1);
    else {
      setRest(0);
      setCount(0);
      setRun((r) => r + 1);
    }
  }, 90);
  return (
    <MessageThread label="Dinner conversation" className={styles.thread2}>
      <Message from="user" text={FOLLOW_UP} />
      <Message
        key={run}
        from="assistant"
        text={words.slice(0, count).join(" ")}
        copyText={FOLLOW_REPLY}
        status={streaming ? "streaming" : "complete"}
      />
    </MessageThread>
  );
}

const LIST_BEFORE = `# Shopping list, 8 guests
Pork shoulder, 2.5 kg
Potatoes, 2 kg
Burrata, 3
Lemons, 6
Salad leaves, 2 bags`;

const LIST_AFTER = `# Shopping list, 10 guests
Pork shoulder, 2.5 kg
Potatoes, 2.5 kg
Burrata, 4
Lemons, 6
Salad leaves, 3 bags`;

function Diff() {
  const lines = LIST_AFTER.split("\n");
  const [count, setCount] = useState(lines.length);
  const [rest, setRest] = useState(0);
  const streaming = count < lines.length;
  useLoop(() => {
    if (streaming) setCount((c) => c + 1);
    else if (rest < 16) setRest((r) => r + 1);
    else {
      setRest(0);
      setCount(0);
    }
  }, 380);
  return (
    <DiffView
      before={LIST_BEFORE}
      after={lines.slice(0, count).join("\n") + (streaming ? "\n" : "")}
      name="shopping-list.md"
      streaming={streaming}
      className={styles.diff}
    />
  );
}

const MODELS: ModelOption[] = [
  { id: "quick", name: "Quick", description: "Fast answers to short questions" },
  { id: "balanced", name: "Balanced", description: "Good for most planning" },
  { id: "thorough", name: "Thorough", description: "Thinks longer before it answers" },
];

function Model() {
  const [model, setModel] = useState("balanced");
  return (
    <div className={styles.center}>
      <ModelPicker models={MODELS} value={model} onValueChange={setModel} label="Model" />
    </div>
  );
}

const TIP = "Put the pork in at 11. It can rest under foil while the potatoes crisp.";

function Feedback() {
  return (
    <div className={styles.reply}>
      <p>{TIP}</p>
      <ResponseActions text={TIP} onRetry={() => {}} onComment={() => {}} />
    </div>
  );
}

function Voice() {
  return (
    <div className={styles.center}>
      <div className={styles.voice}>
        <VoiceInput simulate="allow" maxDuration={30}>
          <span className={styles.voiceIdle}>Add to the shopping list by voice</span>
        </VoiceInput>
      </div>
    </div>
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Notify() {
  return (
    <div className={styles.center}>
      <Button
        variant="secondary"
        onClick={() =>
          toast.promise(wait(1200), {
            loading: "Sending the menu…",
            success: "Menu sent to 8 guests",
            error: "Menu not sent",
          })
        }
      >
        Email the menu
      </Button>
    </div>
  );
}

type Diner = { id: string; name: string; party: number; diet: string };

const DINERS: Diner[] = [
  { id: "maya", name: "Maya Chen", party: 2, diet: "Vegetarian" },
  { id: "jon", name: "Jon Okafor", party: 1, diet: "None" },
  { id: "priya", name: "Priya Raman", party: 3, diet: "Nut allergy" },
  { id: "sam", name: "Sam Lee", party: 2, diet: "Vegan" },
  { id: "ana", name: "Ana Souza", party: 1, diet: "None" },
  { id: "tom", name: "Tom Varga", party: 2, diet: "Gluten-free" },
];

const DINER_COLUMNS: DataTableColumn<Diner>[] = [
  { key: "name", header: "Guest", width: 132, sortable: true },
  { key: "party", header: "Party", width: 88, align: "end", sortable: true },
  { key: "diet", header: "Dietary", width: 128, sortable: true },
];

function Diners() {
  return (
    <DataTable
      aria-label="Guests"
      className={styles.table}
      columns={DINER_COLUMNS}
      rows={DINERS}
      getRowId={(d) => d.id}
      getRowLabel={(d) => d.name}
      rowHeight={40}
    />
  );
}

function GuestDetails() {
  const [open, setOpen] = useState(false);
  // Mounted on the first press, so a drawer nobody opens adds nothing to the page.
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className={styles.center}>
      <Button
        ref={ref}
        variant="secondary"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        Priya’s details
      </Button>
      {mounted && (
        <Drawer
          open={open}
          onOpenChange={setOpen}
          triggerRef={ref}
          title="Priya Raman"
          description="Party of 3 · Coming Saturday"
          footer={
            <DrawerActions>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DrawerActions>
          }
        >
          <p className={styles.drawerNote}>Nut allergy: no pesto or praline. Bringing her two sisters and a bottle of white.</p>
        </Drawer>
      )}
    </div>
  );
}

const DIET_FILTERS = ["Vegetarian", "Vegan", "Gluten-free", "Nut-free", "Dairy-free"];

function DietFilters() {
  const [on, setOn] = useState<string[]>(["Vegetarian"]);
  useLoop(() => {
    const next = DIET_FILTERS[(DIET_FILTERS.indexOf(on.at(-1) ?? "") + 1) % DIET_FILTERS.length];
    setOn((v) => (v.includes(next) ? v.filter((d) => d !== next) : [...v, next].slice(-2)));
  }, 2400);
  return (
    <div className={styles.field}>
      <ChipGroup aria-label="Dietary filters">
        {DIET_FILTERS.map((d) => (
          <Chip key={d} pressed={on.includes(d)} onPressedChange={(p) => setOn((v) => (p ? [...v, d] : v.filter((x) => x !== d)))}>
            {d}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

function Cancel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className={styles.center}>
      <Button ref={ref} variant="secondary" onClick={() => setOpen(true)}>
        Cancel the dinner
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        triggerRef={ref}
        tone="danger"
        title="Cancel Saturday’s dinner?"
        description="All 8 guests get an email saying it’s off."
        confirmLabel="Cancel dinner"
        cancelLabel="Keep dinner"
        onConfirm={async () => {
          await wait(700);
          toast("Dinner cancelled", { action: { label: "Undo", onClick: () => toast.success("Dinner is back on") } });
        }}
      />
    </div>
  );
}

function Arrival() {
  const titleId = useId();
  const [time, setTime] = useState("7:00 pm");
  const [draft, setDraft] = useState(time);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.center}>
      <div className={styles.line}>
        <span>
          Guests arrive at <strong>{time}</strong>
        </span>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setDraft(time);
          }}
          labelledBy={titleId}
          trigger={
            <Button variant="secondary">
              Edit
            </Button>
          }
        >
          {({ close }) => (
            <form
              className={styles.pop}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) setTime(draft.trim());
                close();
              }}
            >
              <h2 id={titleId} className={styles.popTitle}>
                Arrival time
              </h2>
              <TextField label="Time" value={draft} onChange={(e) => setDraft(e.currentTarget.value)} />
              <div className={styles.popActions}>
                <Button variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          )}
        </Popover>
      </div>
    </div>
  );
}

function Search() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const done = (message: string) => () => toast(message);
  const commands: Command[] = [
    { id: "guest", label: "Add a guest", group: "Dinner", icon: <Icon name="plus" />, onSelect: done("Guest added") },
    { id: "list", label: "Open the shopping list", group: "Dinner", icon: <Icon name="menu" />, onSelect: done("Opened the shopping list") },
    { id: "menu", label: "Copy the menu link", group: "Dinner", icon: <Icon name="link" />, keywords: ["share"], onSelect: done("Link copied") },
    { id: "export", label: "Download the timing plan", group: "Dinner", icon: <Icon name="download" />, onSelect: done("Timing plan downloaded") },
  ];
  return (
    <div className={styles.center}>
      <Button ref={ref} variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="search" />
        Search the plan
      </Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        triggerRef={ref}
        placeholder="Search the dinner plan…"
      />
    </div>
  );
}

function Reminders() {
  return (
    <div className={styles.settings}>
      <Switch side="end" defaultChecked label="Remind guests the day before" description="A text goes out at noon on Friday." />
      <Switch side="end" label="Share the shopping list" description="Guests can see what’s still needed." />
    </div>
  );
}

const TART = ["Lemons", "Butter", "Eggs"];

function Tart() {
  const [have, setHave] = useState<string[]>(["Lemons"]);
  const all = have.length === TART.length;
  return (
    <div className={styles.checks}>
      <Checkbox
        label="Lemon tart"
        checked={all}
        indeterminate={have.length > 0 && !all}
        onCheckedChange={() => setHave(all ? [] : TART)}
      />
      <div className={styles.nested}>
        {TART.map((item) => (
          <Checkbox
            key={item}
            label={item}
            checked={have.includes(item)}
            onCheckedChange={(on) => setHave((h) => (on ? [...h, item] : h.filter((x) => x !== item)))}
          />
        ))}
      </div>
    </div>
  );
}

function Serving() {
  return (
    <div className={styles.center}>
      <SegmentedControl aria-label="How it’s served" defaultValue="family" widths="content">
        <Segment value="plated">Plated</Segment>
        <Segment value="family">Family style</Segment>
        <Segment value="buffet">Buffet</Segment>
      </SegmentedControl>
    </div>
  );
}

const DIETS: SelectOption[] = [
  { value: "none", label: "No restrictions" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten", label: "Gluten-free" },
  { value: "nuts", label: "Nut allergy" },
];

function Diet() {
  return (
    <div className={styles.field}>
      <Select label="Jon’s dietary needs" options={DIETS} defaultValue="vegetarian" hint="The menu plans a main he can eat." />
    </div>
  );
}

function Questions() {
  return (
    <Accordion defaultValue="bring" collapsible headingLevel={2} className={styles.faq}>
      <AccordionItem value="bring" title="What should I bring?">
        Nothing at all. If you’d like to, bring a bottle you enjoy.
      </AccordionItem>
      <AccordionItem value="parking" title="Is there parking?">
        Plenty on the street after 6, and it’s free on Saturdays.
      </AccordionItem>
      <AccordionItem value="plus-one" title="Can I bring someone?">
        Yes. Add them to the guest list so there’s a chair for them.
      </AccordionItem>
    </Accordion>
  );
}

function Guests() {
  return (
    <div className={styles.field}>
      <Slider label="Chairs at the table" min={4} max={12} defaultValue={10} />
    </div>
  );
}

const RSVPS = [
  "Maya Chen", "Jon Okafor", "Priya Raman", "Sam Lee", "Ana Souza",
  "Tom Varga", "Ellen Varga", "Ben Adeyemi", "Lucía Moreno", "Kit Hughes",
];

function Rsvps() {
  return (
    <ScrollArea label="Guests who said yes" className={styles.scroll}>
      <ul className={styles.rsvps}>
        {RSVPS.map((name) => (
          <li key={name}>
            <span>{name}</span>
            <span className={styles.note}>Coming</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function Invite() {
  return (
    <div className={styles.field}>
      {/* Four boxes: six (288px) overflow the tile between 961 and ~1100px wide. */}
      <CodeInput label="Invitation code" length={6} hint="Six digits, on the card Maya sent you." />
    </div>
  );
}

function Headcount() {
  return (
    <div className={styles.stats}>
      <Stat label="Coming" value={10} delta={{ value: "2", direction: "up", tone: "positive", label: "since Monday" }} />
      <Stat label="Still to reply" value={3} hint="Reminders go out on Friday." />
    </div>
  );
}

function NoNotes() {
  return (
    <div className={styles.center}>
      <EmptyState
        art="stack"
        title="No dietary notes yet"
        titleAs="h2"
        description="Ask guests what they can’t eat and it shows up here."
        action={
          <Button variant="secondary" onClick={() => toast.success("Asked 10 guests")}>
            Ask guests
          </Button>
        }
      />
    </div>
  );
}

const SCHEDULES = [
  { value: "full", label: "Pay in full", meta: "$1,240.00", description: "Due 14 days after booking" },
  { value: "split", label: "Two payments", meta: "2 × $620.00", description: "Half now, half in 30 days" },
  { value: "monthly", label: "Monthly", meta: "4 × $310.00", description: "On the 1st, starting next month" },
];

function Schedule() {
  return (
    <div className={styles.field}>
      <RadioGroup label="Payment schedule" name="schedule" variant="cards" options={SCHEDULES} defaultValue="split" />
    </div>
  );
}

const INVOICES = 48;
const SUPPER = ["Guest list", "Menu", "Seating", "Invitations"];

function Sending() {
  // At rest partway through; while playing, the batch finishes, rests, and
  // goes again.
  const [sent, setSent] = useState(31);
  const [rest, setRest] = useState(0);
  useLoop(() => {
    if (sent < INVOICES) setSent((n) => Math.min(INVOICES, n + 1 + Math.floor(Math.random() * 3)));
    else if (rest < 12) setRest((r) => r + 1);
    else {
      setRest(0);
      setSent(0);
    }
  }, 300);
  return (
    <div className={styles.field}>
      <Progress
        label={sent >= INVOICES ? "48 invitations sent" : "Sending invitations"}
        value={sent}
        max={INVOICES}
      />
      <ProgressSteps label="Plan the supper" steps={SUPPER} current={2} />
    </div>
  );
}

function Unreplied() {
  return (
    <div className={styles.center}>
      <Alert
        className={styles.alert}
        tone="warning"
        title="Two guests haven’t replied"
        actions={
          <Button variant="secondary" onClick={() => toast.success("Reminder sent to Priya and Tom")}>
            Send a reminder
          </Button>
        }
      >
        Priya and Tom were invited on October 12. Seating closes Thursday.
      </Alert>
    </div>
  );
}

function Seats() {
  const [guests, setGuests] = useState(8);
  const [up, setUp] = useState(true);
  // While playing, steps between 6 and 10 so the digits morph.
  useLoop(() => {
    const dir = (up && guests < 10) || guests <= 6;
    setUp(dir);
    setGuests((g) => g + (dir ? 1 : -1));
  }, 1400);
  return (
    <div className={styles.field}>
      <NumberInput label="Guests" value={guests} onValueChange={setGuests} min={1} max={12} hint="The long table seats 12." />
    </div>
  );
}

const SEATS: ComboboxOption[] = [
  { value: "amara", label: "Amara Okafor" },
  { value: "bea", label: "Béatrice Laurent" },
  { value: "chen", label: "Chen Wei" },
  { value: "dmitri", label: "Dmitri Volkov" },
  { value: "elena", label: "Elena García" },
  { value: "farid", label: "Farid Haddad", disabled: true, description: "Already seated beside Maya" },
  { value: "grace", label: "Grace Kim" },
  { value: "hugo", label: "Hugo Lindqvist" },
  { value: "ines", label: "Inês Duarte" },
  { value: "jonah", label: "Jonah Brooks" },
];

function SeatNext() {
  return (
    <div className={styles.field}>
      <Combobox
        label="Seat Jon next to"
        options={SEATS}
        defaultValue="elena"
        emptyMessage={(text) => `No guest named “${text}”`}
        hint="Maya confirms seating on Friday."
      />
    </div>
  );
}

function Mobile() {
  return (
    <div className={styles.field}>
      <PhoneInput label="Mobile" defaultValue="+447700900123" defaultCountry="GB" hint="Only for a text if the venue changes." />
    </div>
  );
}

function Stay() {
  return (
    <div className={styles.field}>
      <DatePicker
        label="Book club weekend"
        mode="range"
        defaultValue={{ start: "2026-11-13", end: "2026-11-15" }}
        weekStartsOn={1}
        hint="Friday to Sunday at the lake house."
      />
    </div>
  );
}

const RECEIPTS = [
  { name: "butcher.pdf", size: 240_000, type: "application/pdf", ms: 1200 },
  { name: "wine-shop.jpg", size: 1_800_000, type: "image/jpeg", ms: 5200, fail: true },
  { name: "florist.png", size: 640_000, type: "image/png", ms: 9000 },
];

// Stands in for a real upload. The wine shop’s receipt fails its first try so
// the retry shows; every other upload runs to the end at its own pace.
const tried = new WeakSet<File>();
function sendReceipt(file: File, { signal, onProgress }: { signal: AbortSignal; onProgress: (f: number) => void }) {
  const plan = RECEIPTS.find((r) => r.name === file.name);
  const fails = plan?.fail && !tried.has(file);
  tried.add(file);
  const ms = plan?.ms ?? 2400;
  return new Promise<void>((resolve, reject) => {
    const start = performance.now();
    const timer = setInterval(() => {
      const done = Math.min(1, (performance.now() - start) / ms);
      onProgress(done);
      if (fails && done > 0.6) {
        clearInterval(timer);
        reject(new Error("Connection lost"));
      } else if (done >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 200);
    signal.addEventListener("abort", () => clearInterval(timer));
  });
}

function Receipts() {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  // Starts with receipts already dropped in. The zone is a fixed height, so
  // filling it moves nothing. The ref keeps StrictMode from adding them twice.
  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const input = ref.current?.querySelector<HTMLInputElement>("input[type=file]");
    if (!input) return;
    const files = new DataTransfer();
    for (const r of RECEIPTS) files.items.add(new File([new Uint8Array(r.size)], r.name, { type: r.type }));
    input.files = files.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, []);
  return (
    <div ref={ref} className={styles.field}>
      <FileUpload
        label="Receipts"
        upload={sendReceipt}
        accept=".pdf,.jpg,.jpeg,.png"
        acceptLabel="PDF, JPG or PNG"
        maxSize={10_000_000}
        maxFiles={6}
      />
    </div>
  );
}

const GRANTS: AuthorizeScope[] = [
  { id: "guests", title: "See your guest list", access: "read", required: true },
  { id: "menus", title: "See menus and recipes", access: "read", required: true },
  { id: "list", title: "Change the shopping list", access: "write" },
  { id: "texts", title: "Text your guests", access: "write" },
  { id: "refunds", title: "Issue refunds", access: "write", defaultGranted: false },
];

function Connect() {
  const [status, setStatus] = useState<AuthorizeStatus>("review");
  const [run, setRun] = useState(0);
  // review → submitting → connected, rest, then start over.
  useLoop(() => setStatus((s) => (s === "review" ? "submitting" : s)), 4200);
  useEffect(() => {
    if (status === "review") return;
    const t = window.setTimeout(
      () => {
        if (status === "submitting") return setStatus("connected");
        setRun((r) => r + 1);
        setStatus("review");
      },
      status === "submitting" ? 1400 : 3200,
    );
    return () => clearTimeout(t);
  }, [status]);
  return (
    <div className={styles.authorize}>
      <Authorize
        key={run}
        headingLevel={3}
        client={{ name: "Copper", returnTo: "localhost:33418", verified: true }}
        server={{ name: "Acme" }}
        account={{ email: "mara@saturdaysupper.example.com" }}
        onSwitchAccount={() => {}}
        scopes={GRANTS}
        status={status}
        onAllow={() => setStatus("submitting")}
        onDeny={() => setStatus("denied")}
      />
    </div>
  );
}

const SEND = {
  id: "send",
  title: "Text 12 guests about 7:30",
  server: "postbox",
  tool: "send_message",
  effect: "send" as const,
  summary: "“We’re starting at 7:30 instead of 7. Same table, 14 Alder Lane.”",
};

function Approve() {
  const [status, setStatus] = useState<ToolApprovalStatus>("waiting");
  const [run, setRun] = useState(0);
  // waiting → allowed once, rest, then ask again.
  useLoop(() => setStatus((s) => (s === "waiting" ? "allowed" : s)), 3800);
  useEffect(() => {
    if (status === "waiting") return;
    const t = window.setTimeout(() => {
      setRun((r) => r + 1);
      setStatus("waiting");
    }, 2600);
    return () => clearTimeout(t);
  }, [status]);
  return (
    <div className={styles.approve}>
      <ToolApproval
        key={run}
        agent="Copper"
        request={SEND}
        status={status}
        scope="once"
        remember={[]}
        askReason={false}
        autoFocus={false}
        onDecide={(d) => setStatus(d.decision === "allow" ? "allowed" : "denied")}
      />
    </div>
  );
}

const CONTEXT = [
  { id: "system", label: "System & tools", value: 12_000 },
  { id: "files", label: "Files", value: 18_000 },
];

function Context() {
  const [chat, setChat] = useState(64_000);
  // The conversation grows past the warning line, then starts again.
  useLoop(() => setChat((c) => (c >= 150_000 ? 64_000 : c + 9_000)), 900);
  return (
    <div className={styles.usage}>
      <UsageBreakdown
        used={30_000 + chat}
        limit={200_000}
        agent="Copper"
        announce={false}
        segments={[...CONTEXT, { id: "chat", label: "Conversation", value: chat }]}
      />
    </div>
  );
}

const SERVERS: Connection[] = [
  { id: "acme", name: "Acme", host: "mcp.acme.example.com", status: "connected", tools: Array.from({ length: 12 }, (_, i) => ({ name: `tool_${i}` })) },
  { id: "ledger", name: "Ledger", host: "mcp.ledger.example.com", status: "connected", tools: Array.from({ length: 6 }, (_, i) => ({ name: `tool_${i}` })) },
  { id: "postbox", name: "Postbox", host: "mcp.postbox.example.net", status: "disabled", tools: Array.from({ length: 4 }, (_, i) => ({ name: `tool_${i}` })) },
];

const NEXT: Partial<Record<Connection["status"], Connection["status"]>> = { disabled: "connecting", connecting: "connected", connected: "disabled" };

function Servers() {
  const [servers, setServers] = useState(SERVERS);
  const set = (id: string, status: Connection["status"]) => setServers((all) => all.map((s) => (s.id === id ? { ...s, status } : s)));
  // Postbox is switched on, connects, and later off again.
  useLoop(() => setServers((all) => all.map((s) => (s.id === "postbox" ? { ...s, status: NEXT[s.status] ?? "disabled" } : s))), 1600);
  return (
    <div className={styles.servers}>
      <Connections
        agent="Copper"
        label="Copper’s connections"
        servers={servers}
        onToggle={(id, on) => set(id, on ? "connected" : "disabled")}
        onReconnect={(id) => set(id, "connected")}
        onRetry={(id) => set(id, "connected")}
      />
    </div>
  );
}

type Entry = {
  /** Registry folder: the tile links to /docs/<name>. */
  name: string;
  title: string;
  /** Fixed, so nothing inside can move the page. */
  height: number;
  /** 0, 1 or 2 on wide screens. One column under 960px, in this order. */
  column: 0 | 1 | 2;
  Demo: () => ReactNode;
};

/**
 * Every component on the canvas, top to bottom within each column. Adding a
 * component is one entry here. Columns end within a few pixels of each other
 * (tile heights plus 24px gaps); keep it that way when adding, and lead each
 * column with AI and core tiles alternating.
 */
const TILES: Entry[] = [
  { column: 0, name: "prompt-input", title: "Prompt input", height: 532, Demo: Chat },
  { column: 0, name: "tool-approval", title: "Tool approval", height: 400, Demo: Approve },
  { column: 0, name: "code-block", title: "Code block", height: 260, Demo: Code },
  { column: 0, name: "response-actions", title: "Response actions", height: 180, Demo: Feedback },
  { column: 0, name: "voice-input", title: "Voice input", height: 176, Demo: Voice },
  { column: 0, name: "chip", title: "Chip", height: 220, Demo: DietFilters },
  { column: 0, name: "select", title: "Select", height: 224, Demo: Diet },
  { column: 0, name: "progress", title: "Progress", height: 240, Demo: Sending },
  { column: 0, name: "checkbox", title: "Checkbox", height: 248, Demo: Tart },
  { column: 0, name: "popover", title: "Popover", height: 176, Demo: Arrival },
  { column: 0, name: "alert", title: "Alert", height: 216, Demo: Unreplied },
  { column: 0, name: "scroll-area", title: "Scroll area", height: 296, Demo: Rsvps },
  { column: 0, name: "number-input", title: "Number input", height: 224, Demo: Seats },
  { column: 0, name: "tooltip", title: "Tooltip", height: 252, Demo: Hints },
  { column: 0, name: "slider", title: "Slider", height: 176, Demo: Guests },
  { column: 1, name: "reasoning", title: "Reasoning", height: 260, Demo: Thinking },
  { column: 1, name: "usage-meter", title: "Usage meter", height: 400, Demo: Context },
  { column: 1, name: "tool-steps", title: "Tool steps", height: 344, Demo: Steps },
  { column: 1, name: "model-picker", title: "Model picker", height: 176, Demo: Model },
  { column: 1, name: "data-table", title: "Data table", height: 220, Demo: Diners },
  { column: 1, name: "button", title: "Button", height: 176, Demo: Confirm },
  { column: 1, name: "switch", title: "Switch", height: 200, Demo: Reminders },
  { column: 1, name: "date-picker", title: "Date picker", height: 232, Demo: Stay },
  { column: 1, name: "dialog", title: "Dialog", height: 176, Demo: Cancel },
  { column: 1, name: "combobox", title: "Combobox", height: 224, Demo: SeatNext },
  { column: 1, name: "accordion", title: "Accordion", height: 276, Demo: Questions },
  { column: 1, name: "phone-input", title: "Phone input", height: 224, Demo: Mobile },
  { column: 1, name: "dropdown-menu", title: "Dropdown menu", height: 176, Demo: Actions },
  { column: 1, name: "code-input", title: "Code input", height: 176, Demo: Invite },
  { column: 1, name: "empty-state", title: "Empty state", height: 360, Demo: NoNotes },
  { column: 1, name: "segmented-control", title: "Segmented control", height: 176, Demo: Serving },
  { column: 2, name: "message-thread", title: "Message thread", height: 336, Demo: Thread },
  { column: 2, name: "authorize", title: "Authorize", height: 576, Demo: Connect },
  { column: 2, name: "sources", title: "Sources", height: 212, Demo: Cited },
  { column: 2, name: "connections", title: "Connections", height: 400, Demo: Servers },
  { column: 2, name: "diff-view", title: "Diff view", height: 300, Demo: Diff },
  { column: 2, name: "drawer", title: "Drawer", height: 220, Demo: GuestDetails },
  { column: 2, name: "text-field", title: "Text field", height: 220, Demo: Password },
  { column: 2, name: "toast", title: "Toast", height: 176, Demo: Notify },
  { column: 2, name: "radio-group", title: "Radio group", height: 448, Demo: Schedule },
  { column: 2, name: "tabs", title: "Tabs", height: 212, Demo: Plan },
  { column: 2, name: "file-upload", title: "File upload", height: 336, Demo: Receipts },
  { column: 2, name: "stat", title: "Stat", height: 212, Demo: Headcount },
  { column: 2, name: "command-palette", title: "Command palette", height: 220, Demo: Search },
];

/**
 * The home page canvas: real components at rest, in three columns of fixed-height
 * tiles. Heights are fixed so nothing a visitor does here can move the page.
 */
/** `kit`: the names in the agent kit, which get a label. */
/** How tall the fade at the fold is, in px; keep in step with --fade in the CSS. */
const FADE = 280;

/**
 * The canvas, cut at a fold: the tiles fade out into `after` (the way to
 * the rest). A tile that starts under the fade is inert, so focus never
 * lands on something you can't see; the cut is measured again on resize.
 */
export function Specimens({ kit = [], after }: { kit?: string[]; after?: ReactNode }) {
  const clip = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Under reduced motion nothing plays, so there is nothing to pause.
  const [still, setStill] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const el = clip.current;
    if (!el) return;
    const mark = () => {
      const box = el.getBoundingClientRect();
      const cut = box.top + el.clientHeight - FADE;
      for (const tile of el.querySelectorAll<HTMLElement>("[data-tile]")) {
        tile.toggleAttribute("inert", tile.getBoundingClientRect().top > cut);
      }
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.fold}>
      <div ref={clip} className={styles.clip}>
        <div className={styles.canvas}>
          <Paused value={paused}>
            {([0, 1, 2] as const).map((column) => (
              <div key={column} className={styles.column}>
                {TILES.filter((t) => t.column === column).map(({ name, title, height, Demo }) => (
                  <Tile key={name} name={name} title={title} height={height} kit={kit.includes(name)}>
                    <Demo />
                  </Tile>
                ))}
              </div>
            ))}
          </Paused>
          <Toaster />
        </div>
      </div>
      <div className={styles.after}>
        {after}
        {!still && (
          <Button
            variant="secondary"
            aria-label={paused ? "Play the demos" : "Pause the demos"}
            onClick={() => setPaused((p) => !p)}
          >
            <Icon name={paused ? "play" : "pause"} />
          </Button>
        )}
      </div>
    </div>
  );
}
