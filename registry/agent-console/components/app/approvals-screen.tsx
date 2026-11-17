"use client";

import { useCallback, useMemo } from "react";
import { ApprovalsInbox, type ApprovalRequest } from "@/components/ui/approvals-inbox/approvals-inbox";
import type { StoredField } from "@/lib/db/database";
import { useConsole } from "./console-context";
import { Page } from "./page-bar";
import { useResource } from "./use-live";

/* Approvals: the Approvals inbox, fed by runs that stopped to ask. A
   decision goes to the server once the inbox's undo window has passed;
   approving resumes the run (with any edits), declining stops it. The list
   polls every three seconds, so new asks arrive while you work. */

/** Checks an edited amount as it's typed, against the `max` the server sends with the field. */
function withChecks(request: ApprovalRequest): ApprovalRequest {
  if (!request.fields) return request;
  return {
    ...request,
    fields: request.fields.map((f) => {
      if (f.inputMode !== "decimal") return f;
      const max = (f as StoredField).max;
      return {
        ...f,
        validate: (value: string) => {
          const n = Number(value);
          if (!value.trim() || !Number.isFinite(n) || n <= 0) return "Enter an amount above zero, like 120.00.";
          if (max !== undefined && n > max) return `Can’t be more than $${max.toFixed(2)}, the amount charged.`;
          return null;
        },
      };
    }),
  };
}

export function ApprovalsScreen({ initial }: { initial?: ApprovalRequest[] }) {
  const { api, refreshStatus } = useConsole();
  const fetch = useCallback(() => api.approvals(), [api]);
  const { data: requests, setData: setRequests, error, reload } = useResource(initial, fetch, 3000, "Approvals didn’t load.");

  const shown = useMemo(() => requests?.map(withChecks) ?? [], [requests]);

  return (
    <Page wide>
      <ApprovalsInbox
        title="Approvals"
        description="What your agents want to do and need a yes for first. Approving lets the run go on; declining stops it."
        requests={shown}
        loading={requests === null && !error}
        error={requests === null ? error : null}
        onRetry={reload}
        defaultGrouping="none"
        onDecide={async (decision) => {
          const updated = await api.decide(decision);
          setRequests((list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? list);
          refreshStatus();
        }}
      />
    </Page>
  );
}
