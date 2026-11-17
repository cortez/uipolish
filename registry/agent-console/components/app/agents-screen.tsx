"use client";

import { useCallback, useId, useState } from "react";
import { AgentSettings, type AgentSettingsValue } from "@/components/ui/agent-settings/agent-settings";
import { Button } from "@/components/ui/button/button";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs/tabs";
import { MODELS } from "@/lib/product";
import type { AgentView } from "@/lib/service";
import { useConsole } from "./console-context";
import { NewRunDialog } from "./new-run-dialog";
import { Page } from "./page-bar";
import { useResource } from "./use-live";
import styles from "./screens.module.css";

/* Agents: one tab per agent, each the Agent settings component (the model,
   its MCP connections, what it may do without asking, which is what sends a
   run to Approvals, and its daily limit) and its instructions. Every setting
   saves in its row; a failed save puts the old value back with the reason. */

export function AgentsScreen({ initial }: { initial?: AgentView[] }) {
  const { api, route, go } = useConsole();
  const fetch = useCallback(() => api.agents(), [api]);
  const { data: agents, setData: setAgents, error, reload: load } = useResource(initial, fetch, 0, "Agents didn’t load.");
  const [starting, setStarting] = useState(false);

  const current = agents?.find((a) => a.id === route.agent) ?? agents?.[0];
  const put = (updated: AgentView) => setAgents((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? list);

  return (
    <Page
      actions={
        current && (
          <Button onClick={() => setStarting(true)}>
            Run {current.name}
          </Button>
        )
      }
    >
      {!agents ? (
        <div className={styles.state}>
          <h1 className={styles.srOnly}>Agents</h1>
          {error ? (
            <EmptyState art="unplugged" title="Agents didn’t load" description={error} action={<Button onClick={load}>Try again</Button>} />
          ) : (
            <p className={styles.loading}>Loading agents…</p>
          )}
        </div>
      ) : (
        <Tabs value={current?.id} onValueChange={(id) => go({ screen: "agents", agent: id })}>
          <TabList aria-label="Agents">
            {agents.map((a) => (
              <Tab key={a.id} value={a.id}>
                {a.name.replace(/ agent$/, "")}
              </Tab>
            ))}
          </TabList>
          {agents.map((a) => (
            <TabPanel key={a.id} value={a.id} className={styles.panel}>
              <AgentPanel agent={a} onSaved={put} />
            </TabPanel>
          ))}
        </Tabs>
      )}
      {agents && current && (
        <NewRunDialog
          key={current.id}
          open={starting}
          onOpenChange={setStarting}
          agents={agents.map((a) => ({ id: a.id, name: a.name }))}
          defaultAgentId={current.id}
          onStarted={(id) => go({ screen: "runs", run: id })}
        />
      )}
    </Page>
  );
}

function AgentPanel({ agent, onSaved }: { agent: AgentView; onSaved: (agent: AgentView) => void }) {
  const { api } = useConsole();
  const settings: AgentSettingsValue = { model: agent.model, policy: agent.policy, dailyLimit: agent.dailyLimit };

  async function change(patch: Partial<AgentSettingsValue>) {
    onSaved({ ...agent, ...patch } as AgentView);
    try {
      onSaved(await api.updateAgent(agent.id, patch));
    } catch (error) {
      onSaved(agent);
      throw error;
    }
  }

  async function server(serverId: string, action: "enable" | "disable" | "reconnect") {
    onSaved({ ...agent, servers: agent.servers.map((s) => (s.id === serverId ? { ...s, status: action === "disable" ? "disabled" : "connecting" } : s)) });
    try {
      onSaved(await api.setServer(agent.id, serverId, action));
    } catch {
      onSaved(agent);
    }
  }

  return (
    <div className={styles.agent}>
      <AgentSettings
        agent={agent.name}
        title={agent.name}
        description={agent.description}
        headingLevel={1}
        idPrefix={agent.id}
        sections={["model", "connections", "permissions", "usage"]}
        settings={settings}
        onChange={change}
        models={MODELS}
        connections={{
          servers: agent.servers,
          onToggle: (id, on) => server(id, on ? "enable" : "disable"),
          onReconnect: (id) => server(id, "reconnect"),
          onRetry: (id) => server(id, "reconnect"),
        }}
        allowed={agent.allowed}
        onRevoke={async (tool) => onSaved(await api.revokeTool(agent.id, tool.id))}
        onRestore={async (tool) => onSaved(await api.restoreTool(agent.id, tool))}
        spending={{ used: agent.spentToday, segments: agent.segments }}
      />
      <Instructions key={agent.id} agent={agent} onSaved={onSaved} />
    </div>
  );
}

/** The agent's system prompt: edit, then Save (or Discard). The result stays until the text changes again. */
function Instructions({ agent, onSaved }: { agent: AgentView; onSaved: (agent: AgentView) => void }) {
  const { api } = useConsole();
  const id = useId();
  const [text, setText] = useState(agent.instructions);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const dirty = text.trim() !== agent.instructions;

  async function save() {
    setBusy(true);
    setNote(null);
    try {
      const saved = await api.updateAgent(agent.id, { instructions: text });
      onSaved(saved);
      setText(saved.instructions);
      setNote({ tone: "done", text: "Saved. New runs follow these." });
    } catch (reason) {
      setNote({ tone: "error", text: reason instanceof Error ? reason.message : "Didn’t save. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${id}-title`}>
      <div className={styles.cardHead}>
        <h2 id={`${id}-title`} className={styles.cardTitle}>
          Instructions
        </h2>
        <p id={`${id}-hint`} className={styles.cardLede}>
          What {agent.name} is told before every run: who it is, how it works, what it must never do.
        </p>
      </div>
      <textarea
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-hint ${id}-note`}
        className={styles.textarea}
        value={text}
        rows={5}
        maxLength={8000}
        onChange={(e) => {
          setText(e.currentTarget.value);
          setNote(null);
        }}
      />
      <div className={styles.cardFoot}>
        <p id={`${id}-note`} role="status" className={styles.note} data-tone={note?.tone}>
          {note?.text ?? (dirty ? "Unsaved changes." : "Changes apply to runs that start after you save.")}
        </p>
        {(dirty || busy) && (
          <>
            <Button variant="ghost" onClick={() => setText(agent.instructions)} disabled={busy}>
              Discard
            </Button>
            <Button onClick={save} busy={busy} busyLabel="Saving…">
              Save instructions
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
