"use client";

import { useCallback } from "react";
import { KnowledgeBase } from "@/components/ui/knowledge-base/knowledge-base";
import type { KnowledgeState } from "@/lib/service";
import { useConsole } from "./console-context";
import { Page } from "./page-bar";
import { useResource } from "./use-live";

/* Knowledge: the Knowledge base block on the API. What the support agent's
   search_knowledge tool reads from. It polls every second while a source is
   moving through ingest, and every eight seconds otherwise. Each change
   waits for the next state before it resolves, so the block shows it at
   once. */

const MOVING = ["queued", "reading", "chunking", "indexing"];

export function KnowledgeScreen({ initial, now }: { initial?: KnowledgeState; now?: number }) {
  const { api, go } = useConsole();
  const fetch = useCallback(() => api.knowledge(), [api]);
  const { data: state, error, reload: load } = useResource(
    initial,
    fetch,
    (s: KnowledgeState) => (s.sources.some((x) => MOVING.includes(x.status)) ? 1000 : 8000),
    "Knowledge didn’t load.",
  );

  /** Runs a change, then loads the new state before resolving. */
  const then = (change: Promise<unknown>) => change.then(load);

  return (
    <Page wide>
      <KnowledgeBase
        agentName="Support agent"
        description="The documents, sites and folders your agents answer from. Test a question to see what they'd find."
        sources={state?.sources ?? []}
        usage={state?.usage}
        batch={state?.batch}
        connected={state?.connected}
        loading={state === null && !error}
        error={state === null ? error : undefined}
        onReload={load}
        onAddFiles={(files) => then(api.addFiles(files.map((f) => ({ name: f.name, size: f.size }))))}
        onReplaceFile={(id, file) => then(api.replaceFile(id, { name: file.name, size: file.size }))}
        onAddWebsite={(url, { crawl }) => then(api.addWebsite(url, crawl))}
        onConnect={(service) => then(api.connectApp(service))}
        onResync={(id) => then(api.resyncSource(id))}
        onRetry={(ids) => then(api.retrySources(ids))}
        onRemove={(id) => then(api.removeSource(id))}
        onTest={(question) => api.testRetrieval(question)}
        testSuggestions={["Can I get a refund for a double charge?", "How do I export a report to CSV?", "When is SSO available?"]}
        onUpgrade={() => go({ screen: "usage" })}
        now={now}
      />
    </Page>
  );
}
