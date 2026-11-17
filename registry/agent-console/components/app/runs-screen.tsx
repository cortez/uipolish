"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button/button";
import { DEFAULT_FILTERS, RunHistory, type RunDetail, type RunFilters } from "@/components/ui/run-history/run-history";
import { toast } from "@/components/ui/toast/toast";
import type { AgentOption, RunsPage } from "@/lib/service";
import { useConsole } from "./console-context";
import { NewRunDialog } from "./new-run-dialog";
import { Page } from "./page-bar";
import { messageOf, usePoll, useTimeZone } from "./use-live";

/* Runs: the Run history block on the API. The page polls every two seconds,
   so running rows count up and finish in place; runs that started since
   the list was shown wait behind "Show n new runs" unless you started them
   here. The open run is in the URL (?run=), and its trace polls faster
   while it runs. */

export type RunsInitial = { page: RunsPage; agents: AgentOption[]; at: number };

export function RunsScreen({ initial }: { initial?: RunsInitial }) {
  const { api, route, go, refreshStatus, runUrl } = useConsole();
  const timeZone = useTimeZone();
  const [filters, setFilters] = useState<RunFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RunsPage | null>(initial?.page ?? null);
  const [agents, setAgents] = useState<AgentOption[]>(initial?.agents ?? []);
  const [shownAt, setShownAt] = useState(initial?.at ?? 0);
  const [mine, setMine] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Each new filter or page bumps this; a poll that returns after a bump is dropped.
  const version = useRef(0);

  const selectedId = route.screen === "runs" ? (route.run ?? null) : null;
  const [detail, setDetail] = useState<RunDetail>();
  // Kept with the id it's about, so opening another run starts clean.
  const [failure, setFailure] = useState<{ id: string; message: string }>();

  const load = useCallback(
    async (next: RunFilters, nextPage: number) => {
      const v = ++version.current;
      setRefreshing(true);
      try {
        const result = await api.runs({ filters: next, page: nextPage });
        if (v !== version.current) return;
        setData(result);
        setShownAt(Date.now());
        setError(undefined);
      } catch (reason) {
        if (v === version.current) setError(messageOf(reason, "Runs didn’t load."));
      } finally {
        if (v === version.current) setRefreshing(false);
      }
    },
    [api],
  );

  const poll = useCallback(async () => {
    const v = version.current;
    const result = await api.runs({ filters, page });
    if (v === version.current) setData(result);
  }, [api, filters, page]);

  // The demo has no server render: load on mount.
  useEffect(() => {
    if (initial) return;
    let live = true;
    Promise.all([api.runs({ filters: DEFAULT_FILTERS, page: 1 }), api.agents()]).then(
      ([first, list]) => {
        if (!live) return;
        setData(first);
        setShownAt(Date.now());
        setAgents(list.map((a) => ({ id: a.id, name: a.name })));
      },
      (reason) => live && setError(messageOf(reason, "Runs didn’t load.")),
    );
    return () => {
      live = false;
    };
  }, [initial, api]);

  usePoll(poll, 2000, !!data);

  const loadDetail = useCallback(
    (id: string) =>
      api.run(id).then(
        (d) => (d ? setDetail(d) : setFailure({ id, message: "There’s no run with that id in this workspace." })),
        (reason) => setFailure({ id, message: messageOf(reason, "The trace didn’t load.") }),
      ),
    [api],
  );

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const open = detail && detail.id === selectedId ? detail : undefined;
  const detailError = failure && failure.id === selectedId ? failure.message : undefined;
  const running = open?.run?.status === "running";
  usePoll(() => selectedId && loadDetail(selectedId), 1200, !!selectedId && running);

  // Runs that started after the list was shown wait behind "Show n new runs", on the first page.
  const fresh = (startedAt: string, id: string) => page === 1 && Date.parse(startedAt) > shownAt && !mine.has(id);
  const runs = data?.runs.filter((r) => !fresh(r.startedAt, r.id)) ?? [];
  const held = (data?.runs.length ?? 0) - runs.length;

  function started(id: string) {
    setMine((set) => new Set(set).add(id));
    void poll();
    refreshStatus();
  }

  async function cancel() {
    if (!open) return;
    setCancelling(true);
    try {
      await api.cancelRun(open.id);
      await loadDetail(open.id);
      refreshStatus();
    } catch (reason) {
      toast.error("Couldn’t cancel the run", { description: reason instanceof Error ? reason.message : undefined });
    } finally {
      setCancelling(false);
    }
  }

  const startButton = (
    <Button variant={selectedId ? "secondary" : "primary"} onClick={() => setStarting(true)} disabled={!agents.length}>
      New run
    </Button>
  );

  return (
    <Page
      wide
      actions={
        <>
          {running && (
            <Button variant="secondary" busy={cancelling} busyLabel="Cancelling…" onClick={cancel}>
              Cancel run
            </Button>
          )}
          {startButton}
        </>
      }
    >
      <RunHistory
        description="Every run of every agent: what it was asked, each model and tool call, and what it cost."
        runs={runs}
        total={Math.max(0, (data?.total ?? 0) - held)}
        page={page}
        onPageChange={(p) => {
          setPage(p);
          void load(filters, p);
        }}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
          void load(next, 1);
        }}
        agents={agents.map((a) => a.name)}
        newRuns={held}
        onShowNewRuns={() => setShownAt(Date.now())}
        loading={!data && !error}
        refreshing={refreshing && !!data}
        error={!data ? error : undefined}
        onRetry={() => load(filters, page)}
        selectedId={selectedId}
        onSelect={(id) => go({ screen: "runs", run: id })}
        detail={open}
        detailLoading={!!selectedId && !open && !detailError}
        detailError={detailError}
        onRetryDetail={() => {
          if (!selectedId) return;
          setFailure(undefined);
          void loadDetail(selectedId);
        }}
        onRerun={async (run) => {
          const id = await api.rerun(run.id);
          started(id);
          return id;
        }}
        onShare={(run) => runUrl(run.id)}
        emptyDescription="Runs start from a schedule, a webhook, or here. Each one shows every call the agent made and what it cost."
        emptyAction={startButton}
        timeZone={timeZone}
        now={initial?.at}
      />
      <NewRunDialog
        open={starting}
        onOpenChange={setStarting}
        agents={agents}
        onStarted={(id) => {
          started(id);
          go({ screen: "runs", run: id });
        }}
      />
    </Page>
  );
}
