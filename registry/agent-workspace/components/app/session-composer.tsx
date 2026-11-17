"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { RemovableChip } from "@/components/ui/chip/chip";
import { DropdownMenu, MenuCheckboxItem, MenuGroup } from "@/components/ui/dropdown-menu/dropdown-menu";
import { Icon } from "@/components/ui/icons/icons";
import { ModelPicker } from "@/components/ui/model-picker/model-picker";
import { PromptInput, type PromptInputHandle } from "@/components/ui/prompt-input/prompt-input";
import { toast } from "@/components/ui/toast/toast";
import { EFFORTS } from "@/lib/coding/config";
import type { PromptInput as Prompt } from "@/lib/coding/service";
import type { Effort, Session } from "@/lib/coding/session";
import { useWorkspace } from "./workspace-context";
import styles from "./session.module.css";

/* The composer: Prompt input with the people a prompt mentions as chips,
   a mention menu, the model and how hard it thinks. Enter sends; while the
   agent works, Send is Stop. A failed send keeps the draft and says why. */

type ComposerProps = {
  /** Sends; resolves once the turn has started. */
  onSend: (prompt: Prompt) => Promise<unknown>;
  working?: boolean;
  onStop?: () => void;
  model?: string;
  effort?: Effort;
  defaultText?: string;
  defaultMentions?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Replaces the hint line (a merged session says why it's closed). */
  hint?: string;
  handleRef?: React.Ref<PromptInputHandle>;
};

export function Composer({
  onSend,
  working = false,
  onStop,
  model: initialModel,
  effort: initialEffort = "medium",
  defaultText = "",
  defaultMentions = [],
  placeholder = "Ask for a change, @ to mention a teammate",
  autoFocus,
  disabled,
  hint: hintOverride,
  handleRef,
}: ComposerProps) {
  const { models, hint, people, user } = useWorkspace();
  const [model, setModel] = useState(() => (models.some((m) => m.id === initialModel) ? initialModel! : models[0].id));
  const [effort, setEffort] = useState<Effort>(initialEffort);
  const [mentions, setMentions] = useState<string[]>(defaultMentions);
  const [text, setText] = useState(defaultText);
  const sending = useRef(false);
  const teammates = people.filter((p) => p.id !== user.id);

  function submit({ text: value, files }: { text: string; files: File[] }) {
    if (sending.current) return false;
    sending.current = true;
    const draft = { text: value, mentions };
    onSend({ text: value, model, effort, mentions, attachments: files.map((f) => f.name) }).then(
      () => setMentions([]),
      (error: unknown) => {
        // Put the prompt back, so nothing typed is lost.
        setText(draft.text);
        setMentions(draft.mentions);
        toast.error(error instanceof Error ? error.message : "Couldn’t send that. Try again.");
      },
    ).finally(() => {
      sending.current = false;
    });
  }

  return (
    <PromptInput
      ref={handleRef}
      className={styles.composer}
      value={text}
      onValueChange={setText}
      onSubmit={submit}
      streaming={working}
      onStop={onStop}
      placeholder={placeholder}
      label="Prompt"
      autoFocus={autoFocus}
      disabled={disabled}
      hint={hintOverride ?? hint}
      footer={
        <div className={styles.composerTools}>
          <DropdownMenu
            side="top"
            trigger={
              <Button variant="ghost" size="sm" className={styles.tool} aria-label="Mention a teammate">
                <Icon name="at" />
              </Button>
            }
          >
            <MenuGroup label="Mention">
              {teammates.map((p) => (
                <MenuCheckboxItem
                  key={p.id}
                  checked={mentions.includes(p.id)}
                  onCheckedChange={(on) => setMentions((m) => (on ? [...m, p.id] : m.filter((id) => id !== p.id)))}
                >
                  {p.name}
                </MenuCheckboxItem>
              ))}
            </MenuGroup>
          </DropdownMenu>
          {mentions.map((id) => {
            const name = people.find((p) => p.id === id)?.name ?? id;
            return (
              <RemovableChip key={id} className={styles.mentionChip} removeLabel={`Don’t mention ${name}`} onRemove={() => setMentions((m) => m.filter((x) => x !== id))}>
                @{name}
              </RemovableChip>
            );
          })}
          <span className={styles.pickers}>
            <ModelPicker models={models} value={model} onValueChange={setModel} side="top" align="end" />
            <span className={styles.effort}>
              <ModelPicker label="Effort" models={EFFORTS} value={effort} onValueChange={(e) => setEffort(e as Effort)} side="top" align="end" />
            </span>
          </span>
        </div>
      }
    />
  );
}

/** The composer under a session's thread. */
export function SessionComposer({ session }: { session: Session }) {
  const { api, refreshSessions } = useWorkspace();
  const working = session.turns.at(-1)?.status === "working";
  const merged = session.pr?.merged ?? false;
  return (
    <div className={styles.composerDock}>
      <Composer
        key={session.id}
        onSend={(prompt) => api.prompt(session.id, prompt).then(refreshSessions)}
        working={working}
        onStop={() => {
          api.stop(session.id).catch((error: Error) => toast.error(error.message));
        }}
        model={session.model}
        effort={session.effort}
        disabled={merged}
        placeholder={merged ? "Merged. Start a new session for more changes." : undefined}
        hint={merged ? "This pull request is merged, so the session is closed." : undefined}
      />
    </div>
  );
}
