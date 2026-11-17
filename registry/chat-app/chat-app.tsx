"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Alert } from "../alert/alert";
import { Button } from "../button/button";
import { ConfirmDialog } from "../dialog/dialog";
import { Drawer } from "../drawer/drawer";
import { EmptyState } from "../empty-state/empty-state";
import { Icon } from "../icons/icons";
import { Message, MessageThread, type MessageAttachment, type MessageStatus } from "../message-thread/message-thread";
import { ModelPicker, type ModelOption } from "../model-picker/model-picker";
import { PromptInput, type PromptInputHandle } from "../prompt-input/prompt-input";
import type { Rating } from "../response-actions/response-actions";
import type { Source } from "../sources/sources";
import type { ToolStep } from "../tool-steps/tool-steps";
import { Tooltip } from "../tooltip/tooltip";
import { AssistantMessage } from "./assistant-message";
import { Sidebar } from "./sidebar";
import styles from "./chat-app.module.css";

export { groupConversations } from "./sidebar";
export { withoutCitations } from "./assistant-message";
export type { ModelOption, MessageAttachment, MessageStatus, Rating, Source, ToolStep };

export type ChatConversation = {
  id: string;
  title: string;
  /** Last activity; groups the list into Today, Previous 7 days and Older. */
  updatedAt: number | Date;
};

export type ChatReasoning = {
  text: string;
  /** Still thinking. The block shows a live timer and folds when this turns false. */
  streaming?: boolean;
  /** Seconds spent thinking, when known (from the API or history). */
  duration?: number;
  /** `Date.now()` when thinking began, so a remount keeps counting. */
  startedAt?: number;
  /** Short headlines for what it's doing, newest last; the newest is the label while thinking. */
  steps?: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** Markdown subset: paragraphs, lists, **bold**, `code`. `[1]` after a word cites `sources[0]`. */
  text: string;
  /** Default "complete". */
  status?: MessageStatus;
  /** What went wrong, for a failed reply. */
  error?: string;
  attachments?: MessageAttachment[];
  reasoning?: ChatReasoning;
  steps?: ToolStep[];
  sources?: Source[];
  rating?: Rating;
};

/**
 * - `ready`: nothing in flight.
 * - `loading`: the active conversation's messages are on their way.
 * - `load-error`: they couldn't be loaded; offers `onReload`.
 * - `streaming`: a reply is arriving; Send becomes Stop.
 * - `error`: the last reply failed partway; it offers Retry.
 * - `offline`: no connection; drafting works, sending waits.
 * - `rate-limited`: the plan's limit is used up until `limitResetsAt`.
 */
export type ChatStatus = "ready" | "loading" | "load-error" | "streaming" | "error" | "offline" | "rate-limited";

export type StarterPrompt = {
  /** What the card says. */
  title: string;
  /** One quiet line under it. */
  detail?: string;
  /** What goes into the composer. Defaults to `title`. */
  prompt?: string;
};

export type ChatAppProps = {
  conversations: ChatConversation[];
  /** The conversation list itself is loading. */
  conversationsLoading?: boolean;
  /** `null` for a new chat that hasn't been sent yet. */
  activeId: string | null;
  messages: ChatMessage[];
  status: ChatStatus;

  /** The user sent a message. Add it and the reply to `messages` and move `status` to "streaming". */
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  /** Regenerate a reply: the failed one, or any finished one from its actions. */
  onRetry: (messageId: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  /** Return a promise to show the field as saving; reject with an Error to show its message. */
  onRename: (id: string, title: string) => void | Promise<unknown>;
  /** Return a promise to keep the confirm dialog busy; reject with an Error to show its message. */
  onDelete: (id: string) => void | Promise<unknown>;

  models: ModelOption[];
  model: string;
  onModelChange: (id: string) => void;

  onRate?: (messageId: string, rating: Rating) => void;
  /** Pass to ask "What went wrong?" after a thumbs down. */
  onComment?: (messageId: string, comment: string) => void;
  /** Retry one failed tool step. */
  onRetryStep?: (messageId: string, stepId: string) => void;
  /** For `status="load-error"`. */
  onReload?: () => void;
  /** For `status="rate-limited"`: shows an Upgrade button. */
  onUpgrade?: () => void;
  /** When the limit lifts. A Date is shown as a time, like "3:00 PM". */
  limitResetsAt?: Date | string;

  /** The assistant's name, for labels and the placeholder. */
  assistantName?: string;
  /** Cards on a new chat; choosing one fills the composer, never sends. Three or four. */
  starters?: StarterPrompt[];
  /** The new-chat heading. */
  greeting?: string;
  /** A line under the composer. */
  composerHint?: ReactNode;
  /** `accept` for attachments; `false` turns attaching off. */
  accept?: string | false;
  /** Under the conversation list: an account row, a plan, usage. */
  sidebarFooter?: ReactNode;
  /** "Now" for grouping the list. Defaults to the time of render. */
  now?: number;
  defaultSidebarOpen?: boolean;
  className?: string;
};

// Below this width the list moves into a drawer.
const NARROW = 720;

function useNarrow(ref: RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setNarrow(el.getBoundingClientRect().width < NARROW);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return narrow;
}

/**
 * Fades the thread's top and bottom edges while there's more past them: the
 * scroll area's technique, on the thread's own scroller (its role="log"). Sets
 * two 0/1 numbers the stylesheet transitions; never re-renders, so streaming
 * stays cheap. Measured a frame late, after the thread has pinned itself to
 * the bottom, so a following reply never flashes the bottom fade.
 */
function useEdgeFades(ref: RefObject<HTMLElement | null>, key: number) {
  useLayoutEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>('[role="log"]');
    if (!scroller) return;
    let pending = 0;
    let ready = 0;
    const measure = () => {
      pending = 0;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const pos = scroller.scrollTop;
      scroller.style.setProperty("--chat-fade-top", pos > 1 ? "1" : "0");
      scroller.style.setProperty("--chat-fade-bottom", pos < max - 1 ? "1" : "0");
      scroller.style.setProperty("--chat-fade-bar", `${Math.max(0, scroller.offsetWidth - scroller.clientWidth)}px`);
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(measure);
    };
    measure();
    // The first measure lands without a transition, so an opened chat doesn't fade its edges in.
    ready = requestAnimationFrame(() => {
      scroller.dataset.fadeReady = "";
    });
    scroller.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(scroller);
    if (scroller.firstElementChild) resize.observe(scroller.firstElementChild);
    return () => {
      cancelAnimationFrame(pending);
      cancelAnimationFrame(ready);
      scroller.removeEventListener("scroll", schedule);
      resize.disconnect();
      delete scroller.dataset.fadeReady;
    };
  }, [ref, key]);
}

function formatReset(at: Date | string | undefined) {
  if (!at) return null;
  if (typeof at === "string") return at;
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function SidebarGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M6.25 3v10" />
    </svg>
  );
}

/** A whole assistant screen: conversation list, thread, composer, and every state between. */
export function ChatApp({
  conversations,
  conversationsLoading = false,
  activeId,
  messages,
  status,
  onSend,
  onStop,
  onRetry,
  onSelect,
  onNew,
  onRename,
  onDelete,
  models,
  model,
  onModelChange,
  onRate,
  onComment,
  onRetryStep,
  onReload,
  onUpgrade,
  limitResetsAt,
  assistantName = "Assistant",
  starters = [],
  greeting = "What can I help with?",
  composerHint,
  accept,
  sidebarFooter,
  now: nowProp,
  defaultSidebarOpen = true,
  className,
}: ChatAppProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(rootRef);
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Kept after the dialog closes, so its text holds while it fades out.
  const [deleting, setDeleting] = useState<ChatConversation | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const composerRef = useRef<PromptInputHandle>(null);
  const newChatRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();
  const [now] = useState(() => nowProp ?? Date.now());

  // A new chat that gets its id on first send is still the same thread: keep it
  // mounted so the reply streaming into it isn't reset. Any other switch starts fresh,
  // and history that's already there doesn't animate in.
  const [thread, setThread] = useState({ key: 0, activeId });
  if (thread.activeId !== activeId) {
    const continued = thread.activeId === null && messages.length > 0;
    setThread({ key: continued ? thread.key : thread.key + 1, activeId });
  }
  const mainRef = useRef<HTMLElement>(null);
  useEdgeFades(mainRef, thread.key);

  // Leaving the narrow layout closes the drawer, so it can't reappear later.
  if (!narrow && drawerOpen) setDrawerOpen(false);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const title = active?.title || "New chat";
  const streaming = status === "streaming";
  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  const resetLabel = formatReset(limitResetsAt);

  function handleNew() {
    setDrawerOpen(false);
    onNew();
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function handleSelect(id: string) {
    setDrawerOpen(false);
    if (id !== activeId) onSelect(id);
  }

  const sidebar = (
    <Sidebar
      conversations={conversations}
      loading={conversationsLoading}
      activeId={activeId}
      now={nowProp ?? now}
      onSelect={handleSelect}
      onNew={handleNew}
      onRename={onRename}
      onDeleteRequest={(c) => {
        setDeleting(c);
        setConfirmOpen(true);
      }}
      newChatRef={newChatRef}
      footer={sidebarFooter}
      inDrawer={narrow}
    />
  );

  let empty: ReactNode;
  if (status === "loading") {
    empty = (
      <p className={styles.loading} role="status">
        Loading conversation…
      </p>
    );
  } else if (status === "load-error") {
    empty = (
      <EmptyState
        art="unplugged"
        title="Couldn’t load this chat"
        description="Check your connection, then try again. Your other chats are still here."
        action={
          onReload && (
            <Button variant="secondary" onClick={onReload}>
              Try again
            </Button>
          )
        }
      />
    );
  } else {
    empty = (
      <div className={styles.welcome}>
        <h3 className={styles.greeting}>{greeting}</h3>
        {starters.length > 0 && (
          <ul className={styles.starters} aria-label="Starter prompts">
            {starters.map((s) => (
              <li key={s.title}>
                <button
                  type="button"
                  className={styles.starter}
                  onClick={() => composerRef.current?.setText(s.prompt ?? s.title)}
                >
                  <span className={styles.starterTitle}>{s.title}</span>
                  {s.detail && <span className={styles.starterDetail}>{s.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const showMessages = status !== "loading" && status !== "load-error";
  const blocked = status === "offline" || status === "rate-limited" || !showMessages;

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-narrow={narrow || undefined}
      data-sidebar={!narrow && sidebarOpen ? "open" : "closed"}
    >
      {!narrow && (
        <aside id={sidebarId} className={styles.sidebar} aria-label="Chat history" inert={!sidebarOpen}>
          <div className={styles.sidebarInner}>{sidebar}</div>
        </aside>
      )}

      <section ref={mainRef} className={styles.main} aria-label={title}>
        <header className={styles.header}>
          <Tooltip content={narrow ? "Chats" : sidebarOpen ? "Hide chats" : "Show chats"} describe={false}>
            <button
              ref={toggleRef}
              type="button"
              className={styles.iconButton}
              aria-label={narrow ? "Chats" : sidebarOpen ? "Hide chats" : "Show chats"}
              aria-expanded={narrow ? drawerOpen : sidebarOpen}
              aria-controls={narrow ? undefined : sidebarId}
              onClick={() => (narrow ? setDrawerOpen(true) : setSidebarOpen((o) => !o))}
            >
              <SidebarGlyph />
            </button>
          </Tooltip>
          {(narrow || !sidebarOpen) && (
            <Tooltip content="New chat" describe={false}>
              <button type="button" className={styles.iconButton} aria-label="New chat" onClick={handleNew}>
                <Icon name="plus" />
              </button>
            </Tooltip>
          )}
          <h2 className={styles.title}>{title}</h2>
          <ModelPicker
            className={styles.model}
            models={models}
            value={model}
            onValueChange={onModelChange}
            align="end"
            disabled={streaming}
          />
        </header>

        <MessageThread key={thread.key} className={styles.thread} label={title} empty={empty}>
          {/* An empty array, not `false`: the thread counts children to know it's empty. */}
          {(showMessages ? messages : []).map((m) =>
              m.role === "user" ? (
                <Message key={m.id} from="user" text={m.text} attachments={m.attachments} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  author={assistantName}
                  failed={status === "error" && m === lastAssistant}
                  onRetry={streaming ? undefined : () => onRetry(m.id)}
                  onRetryStep={onRetryStep && ((stepId) => onRetryStep(m.id, stepId))}
                  onRate={onRate && ((rating) => onRate(m.id, rating))}
                  onComment={onComment && ((comment) => onComment(m.id, comment))}
                />
              ),
          )}
        </MessageThread>

        <div className={styles.composer}>
          <Alert
            className={styles.notice}
            open={status === "offline"}
            arrive="expand"
            tone="warning"
            title="You’re offline"
          >
            {`${assistantName} will answer once you’re back online. Your draft stays here.`}
          </Alert>
          <Alert
            className={styles.notice}
            open={status === "rate-limited"}
            arrive="expand"
            tone="info"
            title="You’ve reached your limit"
            actions={
              onUpgrade && (
                <Button onClick={onUpgrade}>
                  Upgrade
                </Button>
              )
            }
          >
            {resetLabel ? `It resets at ${resetLabel}. Upgrade for more messages now.` : "Upgrade for more messages now."}
          </Alert>
          <PromptInput
            ref={composerRef}
            placeholder={`Message ${assistantName}`}
            streaming={streaming}
            onStop={onStop}
            onSubmit={({ text, files }) => {
              if (blocked || streaming) return false;
              onSend(text, files);
            }}
            attachments={accept !== false}
            accept={accept || undefined}
            disabled={status === "rate-limited"}
            hint={composerHint}
          />
        </div>
      </section>

      {narrow && (
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="Chats"
          side="start"
          size="sm"
          triggerRef={toggleRef}
          className={styles.drawer}
        >
          {sidebar}
        </Drawer>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this chat?"
        description={
          deleting ? `“${deleting.title || "Untitled chat"}” and everything in it will be deleted. This can’t be undone.` : undefined
        }
        confirmLabel="Delete chat"
        onConfirm={() => (deleting ? onDelete(deleting.id) : undefined)}
        finalFocus={newChatRef}
      />
    </div>
  );
}
