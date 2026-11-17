import type { ApprovalDecision } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { RunStep, RunTrigger } from "@/components/ui/run-history/run-history";
import type { Agent, Approval, Database, Passage, Run } from "@/lib/db/database";
import { newId } from "@/lib/db/ids";
import { APPROVAL_TTL_MS } from "@/lib/product";
import { needsApproval, serverProblem } from "./policy";
import type { AgentRunner, ToolDecision, ToolRequest } from "./runner";
import { TASKS } from "./scenarios";

/* Runs agents: starts a run, hands it to the runner, saves every step it
   yields, and adds up its tokens and cost. When a tool needs a person, it
   adds a "Wait for approval" step, files an Approval and holds the run until
   someone decides (or the approval expires). It works in-process: a run
   lives as long as the server does. In production, start runs in a durable
   worker (a queue, Inngest, Trigger.dev, Vercel Workflow) and keep the
   waiting in your database instead of in `waiters`. */

export type Engine = ReturnType<typeof createEngine>;

type Options = {
  /** Mock traffic: start scheduled and webhook runs on their own every so often, so Runs and Approvals stay live. */
  traffic?: boolean;
  searchKnowledge: (workspaceId: string, query: string) => Promise<Passage[]>;
};

const DAY = 24 * 60 * 60 * 1000;

export function createEngine(db: Database, runner: AgentRunner, options: Options) {
  const live = new Map<string, { controller: AbortController; cancelNote?: string }>();
  const waiters = new Map<string, (decision: ToolDecision) => void>();
  const busy = new Set<string>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  async function spentToday(workspaceId: string, agentId: string) {
    const { runs } = await db.findRuns({ workspaceId, since: Date.now() - DAY, limit: 10_000 });
    return runs.filter((r) => r.agentId === agentId).reduce((sum, r) => sum + r.cost, 0);
  }

  async function start(workspaceId: string, input: { agentId: string; task: string; trigger: RunTrigger; triggeredBy: string }) {
    const agent = await db.getAgent(workspaceId, input.agentId);
    if (!agent) throw new Error("That agent doesn’t exist any more.");
    const task = input.task.trim().replace(/\s+/g, " ");
    if (!task) throw new Error("Say what the agent should do.");
    if (task.length > 400) throw new Error("Keep the task under 400 characters.");
    if ((await spentToday(workspaceId, agent.id)) >= agent.dailyLimit) {
      throw new Error(`${agent.name} has spent its $${agent.dailyLimit.toFixed(2)} for the last 24 hours. Raise its daily limit in Agents.`);
    }
    const run: Run = {
      id: newId("run"),
      workspaceId,
      agentId: agent.id,
      agent: agent.name,
      title: task.length > 90 ? `${task.slice(0, 89)}…` : task,
      task,
      status: "running",
      trigger: input.trigger,
      triggeredBy: input.triggeredBy,
      startedAt: new Date().toISOString(),
      tokens: 0,
      cost: 0,
      steps: [],
    };
    await db.saveRun(run);
    void execute(run, agent);
    return run;
  }

  async function execute(run: Run, agent: Agent) {
    const controller = new AbortController();
    const entry: { controller: AbortController; cancelNote?: string } = { controller };
    live.set(run.id, entry);
    const started = Date.parse(run.startedAt);
    let declined: string | undefined;

    const save = async () => {
      run.tokens = run.steps.reduce((sum, s) => sum + (s.tokens ? s.tokens.input + s.tokens.output : 0), 0);
      run.cost = run.steps.reduce((sum, s) => sum + (s.cost ?? 0), 0);
      await db.saveRun(run);
    };
    const upsert = (step: RunStep) => {
      const i = run.steps.findIndex((s) => s.id === step.id);
      if (i < 0) run.steps.push(step);
      else run.steps[i] = step;
    };

    const authorize = async (request: ToolRequest): Promise<ToolDecision> => {
      // Read the agent again: its permissions may have changed since the run began.
      const current = (await db.getAgent(run.workspaceId, agent.id)) ?? agent;
      const problem = serverProblem(current, request.server);
      if (problem) throw new Error(problem);
      if (!needsApproval(current, request.server, request.name, request.effect)) return { allowed: true };

      const step: RunStep = { id: newId("step"), kind: "tool", name: "Wait for approval", status: "running", startMs: Date.now() - started, input: request.title };
      const approval: Approval = {
        id: newId("apr"),
        workspaceId: run.workspaceId,
        runId: run.id,
        agentId: agent.id,
        title: request.title,
        context: `Run ${run.id}`,
        priority: request.priority,
        status: "pending",
        requestedAt: Date.now(),
        expiresAt: Date.now() + APPROVAL_TTL_MS,
        note: request.note,
        preview: request.preview,
        recipients: request.recipients,
        tool: { server: request.server, name: request.name, arguments: request.arguments },
        fields: request.fields,
      };
      upsert(step);
      await save();
      await db.saveApproval(approval);

      const decision = await new Promise<ToolDecision>((resolve) => {
        const expire = setTimeout(async () => {
          const a = await db.getApproval(run.workspaceId, approval.id);
          if (a?.status === "pending") await db.saveApproval({ ...a, status: "expired" });
          resolve({ allowed: false, reason: "No one decided within an hour, so the approval expired." });
        }, APPROVAL_TTL_MS);
        const done = (d: ToolDecision) => {
          clearTimeout(expire);
          waiters.delete(approval.id);
          resolve(d);
        };
        waiters.set(approval.id, done);
        controller.signal.addEventListener("abort", () => done({ allowed: false, reason: entry.cancelNote ?? "Cancelled." }), { once: true });
      });
      const durationMs = Date.now() - started - step.startMs;
      upsert(
        decision.allowed
          ? { ...step, status: "succeeded", durationMs, output: decision.by ? `Approved by ${decision.by}.` : "Approved." }
          : { ...step, status: controller.signal.aborted ? "cancelled" : "failed", durationMs, error: decision.reason },
      );
      if (!decision.allowed) declined = decision.reason;
      await save();
      return decision;
    };

    try {
      const searchKnowledge = (query: string) => options.searchKnowledge(run.workspaceId, query);
      for await (const event of runner.run({ runId: run.id, agent, task: run.task, searchKnowledge }, { signal: controller.signal, authorize })) {
        if (event.type === "step") upsert(event.step);
        else run.output = event.output;
        await save();
      }
      finish(declined ? "cancelled" : "succeeded", declined);
    } catch (error) {
      if (controller.signal.aborted) finish("cancelled", entry.cancelNote ?? "Cancelled.");
      else finish("failed", undefined, error instanceof Error ? error.message : "The run stopped unexpectedly.");
    } finally {
      live.delete(run.id);
      await save();
    }

    function finish(status: Run["status"], cancelNote?: string, error?: string) {
      run.status = status;
      run.durationMs = Date.now() - started;
      // Anything still running stopped with the run.
      run.steps = run.steps.map((s) => (s.status === "running" ? { ...s, status: "cancelled", durationMs: Date.now() - started - s.startMs } : s));
      if (cancelNote) run.cancelNote = cancelNote;
      if (error) run.error = error;
    }
  }

  return {
    /** Start a run. Resolves with it as soon as it's saved; the runner carries on in the background. */
    start,

    async rerun(workspaceId: string, runId: string, by: string) {
      const run = await db.getRun(workspaceId, runId);
      if (!run) throw new Error("That run isn’t here any more.");
      return start(workspaceId, { agentId: run.agentId, task: run.task, trigger: "user", triggeredBy: by });
    },

    async cancel(workspaceId: string, runId: string, by: string) {
      const run = await db.getRun(workspaceId, runId);
      if (!run) throw new Error("That run isn’t here any more.");
      if (run.status !== "running") throw new Error("That run has already finished.");
      const entry = live.get(runId);
      // Its waiting approvals close with it.
      for (const a of await db.listApprovals(workspaceId)) {
        if (a.runId === runId && a.status === "pending") await db.saveApproval({ ...a, status: "expired" });
      }
      if (entry) {
        entry.cancelNote = `Cancelled by ${by}.`;
        entry.controller.abort();
      } else {
        await db.saveRun({ ...run, status: "cancelled", cancelNote: `Cancelled by ${by}.`, durationMs: Date.now() - Date.parse(run.startedAt) });
      }
    },

    /** Record a decision and let the run go on, or stop it. Throws with a message to show when it can't. */
    async decide(workspaceId: string, decision: ApprovalDecision, by: string) {
      const approval = await db.getApproval(workspaceId, decision.id);
      if (!approval) throw new Error("This request isn’t here any more.");
      if (approval.status !== "pending") throw new Error(`Someone already ${approval.status === "expired" ? "let this expire" : approval.status} this.`);
      const edits = Object.fromEntries(
        Object.entries(decision.edits ?? {}).filter(([key, value]) => approval.fields?.some((f) => f.key === key && f.value !== value)),
      );
      for (const [key, value] of Object.entries(edits)) {
        const field = approval.fields!.find((f) => f.key === key)!;
        if (field.inputMode === "decimal") {
          const n = Number(value);
          if (!Number.isFinite(n) || n <= 0) throw new Error(`${field.label} must be a number above zero.`);
          if (field.max !== undefined && n > field.max) throw new Error(`${field.label} can’t be more than $${field.max.toFixed(2)}.`);
        } else if (!value.trim()) {
          throw new Error(`${field.label} can’t be empty.`);
        }
      }
      const approved = decision.decision === "approve";
      const edited = Object.keys(edits).length > 0;
      const updated: Approval = {
        ...approval,
        status: approved ? "approved" : "declined",
        fields: approval.fields?.map((f) => (f.key in edits ? { ...f, value: edits[f.key] } : f)),
        outcome: { by, at: Date.now(), ...(decision.note && { note: decision.note }), ...(edited && { edited }) },
      };
      await db.saveApproval(updated);
      const resume = waiters.get(approval.id);
      const reason = `Declined by ${by}${decision.note ? `: “${decision.note}”` : "."}`;
      if (resume) {
        resume(approved ? { allowed: true, edits, by } : { allowed: false, reason });
      } else {
        // The run stopped while it waited (the server restarted): close it.
        const run = await db.getRun(workspaceId, approval.runId);
        if (run?.status === "running") {
          await db.saveRun({ ...run, status: "cancelled", cancelNote: "The run stopped before this was decided. Re-run it.", durationMs: Date.now() - Date.parse(run.startedAt) });
        }
      }
      return updated;
    },

    /** With `traffic`, starts the sample traffic for a workspace once: two runs that will ask at once, then one every 15 to 40 seconds while fewer than three run. */
    keepBusy(workspaceId: string) {
      if (!options.traffic || busy.has(workspaceId)) return;
      busy.add(workspaceId);
      const startOne = async (agentId?: string) => {
        const agents = await db.listAgents(workspaceId).catch(() => []);
        const agent = agentId ? agents.find((a) => a.id === agentId) : agents[Math.floor(Math.random() * agents.length)];
        const pool = agent && TASKS[agent.id];
        if (!agent || !pool) return;
        const webhook = Math.random() < 0.5;
        await start(workspaceId, {
          agentId: agent.id,
          task: pool.tasks[Math.floor(Math.random() * pool.tasks.length)],
          trigger: webhook ? "webhook" : "schedule",
          triggeredBy: webhook ? pool.webhook : pool.schedule,
        }).catch(() => {});
      };
      const later = (fn: () => void, ms: number) => {
        if (stopped) return;
        const timer = setTimeout(() => {
          timers.delete(timer);
          fn();
        }, ms);
        timers.add(timer);
        (timer as { unref?: () => void }).unref?.();
      };
      later(() => startOne("agt_support"), 600);
      later(() => startOne("agt_billing"), 2200);
      const tick = () =>
        later(async () => {
          const { total } = await db.findRuns({ workspaceId, status: "running", limit: 0 });
          if (total < 3) await startOne();
          tick();
        }, 15_000 + Math.random() * 25_000);
      tick();
    },

    /** Lets keepBusy start traffic again after stop(): a demo that mounts twice (React's Strict Mode). */
    restart() {
      stopped = false;
    },

    /** Stops the sample traffic and every live run, for a demo that unmounts. */
    stop() {
      stopped = true;
      busy.clear();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      for (const { controller } of live.values()) controller.abort();
    },
  };
}
