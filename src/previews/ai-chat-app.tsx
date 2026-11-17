"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@registry/chat-app/chat-app";
import { CommandPalette, type Command } from "@registry/command-palette/command-palette";
import type { PromptInputHandle } from "@registry/prompt-input/prompt-input";
import { SidebarProvider } from "@registry/sidebar/sidebar";
import { AppSidebar } from "@registry/ai-chat-app/components/app/app-sidebar";
import { ChatView } from "@registry/ai-chat-app/components/app/chat-view";
import { useChat, type ChatTransport } from "@registry/ai-chat-app/components/app/use-chat";
import { applyEvent, settle, type ChatConversationSummary } from "@registry/ai-chat-app/lib/ai/events";
import { mock } from "@registry/ai-chat-app/lib/ai/mock";
import { ASSISTANT_NAME, GREETING, MODELS, STARTERS } from "@registry/ai-chat-app/lib/config";
import app from "@registry/ai-chat-app/components/app/app.module.css";
import styles from "./ai-chat-app.module.css";

/* The template's own sidebar, chat view, chat hook and mock provider, with
   this file standing in for the server: it "saves" each reply by folding
   the same events the route would, so switching chats keeps them. */

const HOUR = 60 * 60 * 1000;
const USER = { name: "Ana Ruiz", email: "ana@acme.example.com" };
const WORKSPACES = [
  { id: "team", name: "Acme" },
  { id: "personal", name: "Personal" },
];

type Saved = { summary: ChatConversationSummary; messages: ChatMessage[] };

function seed(now: number): Map<string, Saved> {
  const chat = (id: string, title: string, ago: number, question: string, answer: string, pinned = false): [string, Saved] => [
    id,
    {
      summary: { id, title, pinned, updatedAt: now - ago },
      messages: [
        { id: `${id}-q`, role: "user", text: question },
        { id: `${id}-a`, role: "assistant", text: answer },
      ],
    },
  ];
  return new Map([
    chat("q3", "Q3 churn by plan", 2 * HOUR, "Summarize Q3 churn by plan in two lines.", "Churn fell on **Pro** (4.1% to 3.2%) and rose on **Free** (9.8% to 11.4%), mostly accounts that never invited a teammate.\n\nThe April price change shows no lasting effect after six weeks.", true),
    chat("sso", "Reply to Northwind about SSO", 5 * HOUR, "Draft a short reply to Northwind asking when SSO is coming.", "Hi Lena, SSO with Okta and Azure AD is in beta now. I can turn it on for Northwind this week. Want me to set up a 20-minute call with our engineer to walk through it?"),
    chat("release", "Release notes for 4.2", 26 * HOUR, "Turn these merged PRs into release notes.", "**Reporting**\n- Scheduled exports, daily or weekly, to email or Slack.\n- CSV filters keep the columns you chose.\n\n**Fixes**\n- Dashboards no longer reset their date range on refresh."),
    chat("hiring", "Interview questions for the design role", 3 * 24 * HOUR, "Five interview questions for a product designer.", "1. Walk me through a design you shipped that you'd now do differently.\n2. How do you decide what not to design?\n3. Tell me about a time research changed your mind.\n4. How do you hand off to engineering?\n5. What's a small detail you fought for?"),
  ]);
}

let ids = 0;
const nextId = (p: string) => `${p}-${++ids}`;

export function AiChatAppPreview() {
  return (
    <SidebarProvider shortcut={false}>
      <Demo />
    </SidebarProvider>
  );
}

function Demo() {
  const [now] = useState(() => Date.now());
  // The "server": chats and their messages, changed in place like a database.
  const [db] = useState(() => seed(now));
  const [list, setList] = useState(() => [...db.values()].map((s) => s.summary));
  const [active, setActive] = useState<string | null>(null);
  // Which thread is mounted. A new chat that gets its id keeps its thread (and the reply streaming into it).
  const [thread, setThread] = useState("new-0");
  const [workspace, setWorkspace] = useState("team");
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");

  const upsert = useCallback((c: ChatConversationSummary) => {
    setList((all) => [c, ...all.filter((x) => x.id !== c.id)].sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  // The route's job, in the browser: create the chat, save both messages, stream from the mock.
  const transport = useMemo<ChatTransport>(
    () =>
      async function* (request, signal) {
        const store = db;
        let saved = request.conversationId ? store.get(request.conversationId) : undefined;
        if (!saved) {
          const id = nextId("chat");
          const title = STARTERS.find((s) => s.prompt === request.text)?.title ?? request.text!.slice(0, 44);
          saved = { summary: { id, title, pinned: false, updatedAt: Date.now() }, messages: [] };
          store.set(id, saved);
        }
        const chat = saved;
        if (request.retryOf) chat.messages = chat.messages.filter((m) => m.id !== request.retryOf);
        const userMessageId = request.text ? nextId("user") : undefined;
        if (request.text) chat.messages.push({ id: userMessageId!, role: "user", text: request.text });
        chat.summary = { ...chat.summary, updatedAt: Date.now() };
        let reply: ChatMessage = { id: nextId("reply"), role: "assistant", text: "", status: "streaming" };
        yield { type: "start", conversation: chat.summary, userMessageId, messageId: reply.id };
        const history = chat.messages.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text }));
        try {
          for await (const event of mock.stream({ model: request.model, system: "", messages: history, signal })) {
            reply = applyEvent(reply, event);
            yield event;
          }
          reply = settle(reply, "complete");
          yield { type: "done" };
        } catch (error) {
          if (signal.aborted) {
            reply = settle(reply, "stopped");
            throw error;
          }
          const message = error instanceof Error ? error.message : "Something went wrong.";
          reply = settle(reply, "error", message);
          yield { type: "error", code: "failed", message };
        } finally {
          chat.messages.push(reply);
        }
      },
    [db],
  );

  function open(id: string) {
    setActive(id);
    setThread(id);
  }

  function startNew() {
    setActive(null);
    setThread(nextId("new"));
  }

  function remove(id: string) {
    const title = list.find((c) => c.id === id)?.title;
    db.delete(id);
    setList((all) => all.filter((c) => c.id !== id));
    if (id === active) startNew();
    setNote(`Deleted “${title}”. In the app, a toast offers Undo.`);
  }

  const commands: Command[] = [
    { id: "new", label: "New chat", group: "Actions", onSelect: startNew },
    ...list.map((c) => ({ id: `chat-${c.id}`, label: c.title, group: "Chats", onSelect: () => open(c.id) })),
  ];

  const saved = active ? db.get(active) : undefined;
  const shown = workspace === "team" ? list : [];

  return (
    <div className={styles.demo}>
      <div className={styles.frame}>
        <AppSidebar
          user={USER}
          workspaces={WORKSPACES}
          workspaceId={workspace}
          onWorkspaceChange={(id) => {
            setWorkspace(id);
            startNew();
          }}
          conversations={shown}
          value={active ?? "new"}
          onSelect={open}
          onNew={startNew}
          onSearch={() => setSearching(true)}
          onRename={async (id, title) => {
            await new Promise((r) => setTimeout(r, 400));
            const s = db.get(id);
            if (s) s.summary = { ...s.summary, title };
            setList((all) => all.map((c) => (c.id === id ? { ...c, title } : c)));
          }}
          onPinnedChange={(id, pinned) => {
            const s = db.get(id);
            if (s) s.summary = { ...s.summary, pinned };
            setList((all) => all.map((c) => (c.id === id ? { ...c, pinned } : c)));
          }}
          onDelete={remove}
          onSettings={() => setNote("Settings opens /settings: Agent settings, Billing and Team members, in tabs.")}
          onSignOut={() => setNote("Sign out clears the session cookie and returns to /sign-in.")}
        />
        <main className={app.main}>
          <PreviewChat
            key={thread}
            id={thread.startsWith("new-") ? null : thread}
            title={saved?.summary.title}
            initialMessages={saved?.messages ?? []}
            transport={transport}
            workspaceId={workspace}
            onConversation={(c, created) => {
              upsert(c);
              if (created) setActive(c.id);
            }}
            titleOf={(id) => list.find((c) => c.id === id)?.title}
          />
        </main>
      </div>
      <CommandPalette
        open={searching}
        onOpenChange={setSearching}
        commands={commands}
        hotkey={false}
        label="Search chats"
        placeholder="Search chats…"
      />
      <p className={styles.note} role="status">
        {note || "Replies stream from the template’s mock provider. Pick a starter for reasoning, tool steps and sources; put /error in a message to see a reply fail partway."}
      </p>
    </div>
  );
}

type PreviewChatProps = {
  id: string | null;
  title?: string;
  initialMessages: ChatMessage[];
  transport: ChatTransport;
  workspaceId: string;
  onConversation: (c: ChatConversationSummary, created: boolean) => void;
  titleOf: (id: string) => string | undefined;
};

function PreviewChat({ id, title, initialMessages, transport, workspaceId, onConversation, titleOf }: PreviewChatProps) {
  const composer = useRef<PromptInputHandle>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [chatId, setChatId] = useState(id);
  // Keep the thread mounted when a new chat gets its id: the parent keys by id only after this.
  const onStart = useCallback(
    (c: ChatConversationSummary, created: boolean) => {
      if (created) setChatId(c.id);
      onConversation(c, created);
    },
    [onConversation],
  );
  const chat = useChat({ conversationId: id, workspaceId, initialMessages, model, transport, onConversation: onStart });
  return (
    <ChatView
      title={(chatId && titleOf(chatId)) ?? title ?? "New chat"}
      messages={chat.messages}
      status={chat.status}
      models={MODELS}
      model={model}
      onModelChange={setModel}
      onSend={chat.send}
      onStop={chat.stop}
      onRetry={chat.retry}
      assistantName={ASSISTANT_NAME}
      greeting={GREETING}
      starters={STARTERS}
      hint="Replies come from a mock model. Set AI_PROVIDER and a key in .env.local to use a real one."
      composerRef={composer}
    />
  );
}
