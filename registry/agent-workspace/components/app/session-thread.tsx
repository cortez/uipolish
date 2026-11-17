"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button/button";
import { MenuItem } from "@/components/ui/dropdown-menu/dropdown-menu";
import { FileChip } from "@/components/ui/file-changes/file-changes";
import { Icon } from "@/components/ui/icons/icons";
import { Markdown } from "@/components/ui/markdown/markdown";
import { toast } from "@/components/ui/toast/toast";
import { TurnFooter, TurnSummary } from "@/components/ui/turn-summary/turn-summary";
import { AGENT_NAME } from "@/lib/coding/config";
import type { Session, Turn } from "@/lib/coding/session";
import { ScrollTicks } from "./scroll-ticks";
import type { SessionLink } from "./use-session";
import { useWorkspace } from "./workspace-context";
import text from "@/components/ui/text/text.module.css";
import styles from "./session.module.css";

/* The conversation: each prompt in a bubble (files it names as chips, the
   people it mentions), then the agent's work folded to one line, its
   answer, and a footer with the files it changed, how long it took, Copy
   and More. It follows the newest line while you're at the bottom and
   holds still once you scroll up, with one control back down. A rail of
   ticks on its edge marks each prompt. */

type SessionThreadProps = {
  session: Session;
  link: SessionLink;
  onOpenFile: (path: string) => void;
  /** Filled with a function that scrolls to a turn, for History. */
  jumpRef: RefObject<(turnId: string) => void>;
};

/** Paths the prompt names ("checkout.spec.ts", "src/lib/redis.ts"), matched against the repository's files. */
function withFileChips(text: string, files: string[], onOpen: (path: string) => void): ReactNode[] {
  const parts = text.split(/([\w@./-]+\.[a-z]{1,5}\b)/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const path = files.find((f) => f === part || f.endsWith(`/${part}`));
    return path ? <FileChip key={i} inline path={path} onClick={() => onOpen(path)} /> : part;
  });
}

export function SessionThread({ session, link, onOpenFile, jumpRef }: SessionThreadProps) {
  const { user, people } = useWorkspace();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [behind, setBehind] = useState(false);
  const last = session.turns.at(-1);
  const working = last?.status === "working";
  const files = useMemo(() => [...new Set([...session.tree, ...session.files.map((f) => f.path)])], [session.tree, session.files]);
  const nameOf = (id: string) => (id === user.id ? "You" : (people.find((p) => p.id === id)?.name ?? "A teammate"));

  // Opening a session starts at its end.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    following.current = true;
  }, [session.id]);

  // While following, new content keeps the end in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (following.current) el.scrollTop = el.scrollHeight;
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      following.current = atEnd;
      setBehind(!atEnd);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const jump = useCallback((turnId: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-turn="${CSS.escape(turnId)}"]`);
    if (!el) return;
    following.current = false;
    el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  useEffect(() => {
    jumpRef.current = jump;
  }, [jump, jumpRef]);

  function toEnd() {
    following.current = true;
    endRef.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  async function copy(text: string, what: string) {
    try {
      if (!navigator.clipboard) throw new Error();
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn’t copy. Select the text instead.");
    }
  }

  return (
    <div className={styles.threadFrame}>
      {link === "reconnecting" && (
        <p className={styles.reconnecting} role="status">
          Reconnecting… The agent keeps working while you’re away.
        </p>
      )}
      <div ref={scrollRef} className={styles.scroll} tabIndex={-1}>
        <div className={styles.thread} role="log" aria-label={`Conversation with ${AGENT_NAME}`} aria-live="off">
          {session.turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              author={nameOf(turn.authorId)}
              mine={turn.authorId === user.id}
              mentions={turn.mentions.map(nameOf)}
              prompt={withFileChips(turn.prompt, files, onOpenFile)}
              attachments={turn.attachments}
              onOpenFile={onOpenFile}
              onCopyPrompt={() => copy(turn.prompt, "Prompt")}
            />
          ))}
          <div ref={endRef} className={styles.end} />
        </div>
      </div>
      <ScrollTicks scrollRef={scrollRef} marks={session.turns.map((t) => ({ id: t.id, label: t.prompt }))} onJump={jump} />
      {behind && (
        <div className={styles.toLatest}>
          <Button variant="secondary" onClick={toEnd}>
            <Icon name="arrow-down" />
            {working ? "Follow the agent" : "Latest"}
          </Button>
        </div>
      )}
      <p className={text.srOnly} role="status">
        {working ? `${AGENT_NAME} is working` : last?.status === "done" ? `${AGENT_NAME} finished` : ""}
      </p>
    </div>
  );
}

type TurnViewProps = {
  turn: Turn;
  author: string;
  mine: boolean;
  mentions: string[];
  prompt: ReactNode[];
  attachments: string[];
  onOpenFile: (path: string) => void;
  onCopyPrompt: () => void;
};

function TurnView({ turn, author, mine, mentions, prompt, attachments, onOpenFile, onCopyPrompt }: TurnViewProps) {
  const working = turn.status === "working";
  return (
    <article className={styles.turn} data-turn={turn.id} aria-label={`${author}: ${turn.prompt.slice(0, 80)}`}>
      <div className={styles.ask} data-mine={mine || undefined}>
        {!mine && <p className={styles.author}>{author}</p>}
        <div className={styles.bubble}>
          <p className={styles.prompt} dir="auto">
            {prompt}
          </p>
          {(mentions.length > 0 || attachments.length > 0) && (
            <p className={styles.context}>
              {mentions.map((name) => (
                <span key={name} className={styles.mention}>
                  @{name}
                </span>
              ))}
              {attachments.map((path) => (
                <FileChip key={path} inline path={path} />
              ))}
            </p>
          )}
        </div>
      </div>

      <div className={styles.answer}>
        {(turn.items.length > 0 || working) && <TurnSummary items={turn.items} working={working} label={`Work on: ${turn.prompt.slice(0, 60)}`} />}
        {turn.reply && <Markdown source={turn.reply} streaming={working} className={styles.reply} />}
        {turn.status === "error" && (
          <p className={styles.failed} role="alert">
            <Icon name="alert" className={styles.failedIcon} />
            {turn.error ?? "The agent stopped with an error."}
          </p>
        )}
        {turn.status === "stopped" && <p className={styles.stopped}>Stopped. Send another prompt to go on.</p>}
        <TurnFooter
          startedAt={turn.startedAt}
          finishedAt={turn.finishedAt}
          working={working}
          copyText={turn.reply || undefined}
          files={turn.files}
          onOpenFile={onOpenFile}
          menu={
            <Fragment>
              {turn.files.length > 0 && <MenuItem onSelect={() => onOpenFile(turn.files[0].path)}>Review changes</MenuItem>}
              <MenuItem onSelect={onCopyPrompt}>Copy prompt</MenuItem>
            </Fragment>
          }
        />
      </div>
    </article>
  );
}
