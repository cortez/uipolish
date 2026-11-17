"use client";

import type { ReactNode, Ref } from "react";
import { Alert } from "@/components/ui/alert/alert";
import { Button } from "@/components/ui/button/button";
import type { ChatMessage, StarterPrompt } from "@/components/ui/chat-app/chat-app";
import { AssistantMessage } from "@/components/ui/chat-app/assistant-message";
import { Message, MessageThread } from "@/components/ui/message-thread/message-thread";
import { ModelPicker, type ModelOption } from "@/components/ui/model-picker/model-picker";
import { PromptInput, type PromptInputHandle } from "@/components/ui/prompt-input/prompt-input";
import type { Rating } from "@/components/ui/response-actions/response-actions";
import { TopBar } from "./top-bar";
import styles from "./chat-view.module.css";

/* One conversation: the header with the model, the thread, the composer.
   The Chat app block's thread and composer, without its own chat list,
   since the app's sidebar holds that. It only renders: Chat wires it to
   the server, the docs preview to the mock. */

export type ChatViewStatus = "ready" | "loading" | "streaming" | "offline" | "rate-limited";

export type ChatViewProps = {
  title: string;
  messages: ChatMessage[];
  status: ChatViewStatus;
  models: ModelOption[];
  model: string;
  onModelChange: (id: string) => void;
  /** Return false to keep the draft in the composer. */
  onSend: (text: string) => void | false;
  onStop: () => void;
  /** Write the last reply again. */
  onRetry: (messageId: string) => void;
  onRate?: (messageId: string, rating: Rating) => void;
  /** For rate-limited: when it lifts. */
  limitResetsAt?: string;
  onUpgrade?: () => void;
  assistantName: string;
  greeting: string;
  starters: StarterPrompt[];
  /** A line under the composer. */
  hint?: ReactNode;
  composerRef?: Ref<PromptInputHandle>;
};

function resetTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function ChatView({
  title,
  messages,
  status,
  models,
  model,
  onModelChange,
  onSend,
  onStop,
  onRetry,
  onRate,
  limitResetsAt,
  onUpgrade,
  assistantName,
  greeting,
  starters,
  hint,
  composerRef,
}: ChatViewProps) {
  const streaming = status === "streaming";
  const last = messages.at(-1);
  const reset = resetTime(limitResetsAt);

  const empty =
    status === "loading" ? (
      <p className={styles.loading} role="status">
        Loading conversation…
      </p>
    ) : (
      <div className={styles.welcome}>
        <h2 className={styles.greeting}>{greeting}</h2>
        {starters.length > 0 && (
          <ul className={styles.starters} aria-label="Starter prompts">
            {starters.map((s) => (
              <li key={s.title}>
                <button
                  type="button"
                  className={styles.starter}
                  onClick={() => {
                    const handle = composerRef && typeof composerRef === "object" ? composerRef.current : null;
                    handle?.setText(s.prompt ?? s.title);
                  }}
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

  return (
    <section className={styles.root} aria-label={title}>
      <TopBar title={title}>
        <ModelPicker models={models} value={model} onValueChange={onModelChange} align="end" disabled={streaming} />
      </TopBar>

      <MessageThread className={styles.thread} label={title} empty={empty}>
        {/* An array, never `false`: the thread counts children to know it's empty. */}
        {(status === "loading" ? [] : messages).map((m) =>
          m.role === "user" ? (
            <Message key={m.id} from="user" text={m.text} />
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              author={assistantName}
              failed={false}
              // Only the last reply can be written again; the ones before it shaped what came after.
              onRetry={m === last && !streaming ? () => onRetry(m.id) : undefined}
              onRate={onRate && ((rating) => onRate(m.id, rating))}
            />
          ),
        )}
      </MessageThread>

      <div className={styles.composer}>
        <Alert className={styles.notice} open={status === "offline"} arrive="expand" tone="warning" title="You’re offline">
          {`${assistantName} will answer once you’re back online. Your draft stays here.`}
        </Alert>
        <Alert
          className={styles.notice}
          open={status === "rate-limited"}
          arrive="expand"
          tone="info"
          title="You’ve reached today’s limit"
          actions={
            onUpgrade && (
              <Button onClick={onUpgrade}>
                See plans
              </Button>
            )
          }
        >
          {reset ? `It resets at ${reset}. A bigger plan raises it now.` : "A bigger plan raises it now."}
        </Alert>
        <PromptInput
          ref={composerRef}
          placeholder={`Message ${assistantName}`}
          streaming={streaming}
          onStop={onStop}
          onSubmit={({ text }) => {
            if (status !== "ready") return false;
            return onSend(text);
          }}
          attachments={false}
          disabled={status === "rate-limited"}
          hint={hint}
        />
      </div>
    </section>
  );
}
