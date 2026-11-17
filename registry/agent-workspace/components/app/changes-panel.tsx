"use client";

import { useMemo } from "react";
import { DiffView } from "@/components/ui/diff-view/diff-view";
import { EmptyState } from "@/components/ui/empty-state/empty-state";
import { FileChanges, FilePath, type FileChange } from "@/components/ui/file-changes/file-changes";
import { Icon } from "@/components/ui/icons/icons";
import { MergeStatus } from "@/components/ui/merge-status/merge-status";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/tabs/tabs";
import { toast } from "@/components/ui/toast/toast";
import { ToolSteps } from "@/components/ui/tool-steps/tool-steps";
import { checkAsStep, checkCounts, checksPending, mergeStateOf, type Session } from "@/lib/coding/session";
import { useWorkspace } from "./workspace-context";
import styles from "./changes.module.css";

/* The right pane: where the pull request stands and its one move (Merge),
   then the repository's files, what this session changed, the checks, and
   the diff of the file you picked. */

type ChangesPanelProps = {
  session: Session;
  tab: string;
  onTabChange: (tab: string) => void;
  /** The file Review shows. */
  review: string | null;
  onReview: (path: string) => void;
};

export function ChangesPanel({ session, tab, onTabChange, review, onReview }: ChangesPanelProps) {
  const { api, refreshSessions } = useWorkspace();
  const state = mergeStateOf(session);
  const working = session.turns.at(-1)?.status === "working";
  const changed = useMemo(() => new Map(session.files.map((f) => [f.path, f])), [session.files]);
  const all: FileChange[] = useMemo(
    () =>
      [...new Set([...session.tree, ...session.files.map((f) => f.path)])]
        .sort((a, b) => a.localeCompare(b))
        .map((path) => {
          const f = changed.get(path);
          return f ? { path, kind: f.kind, from: f.from } : { path };
        }),
    [session.tree, session.files, changed],
  );
  // What Review shows: the file picked, else the first one with both versions to diff.
  const reviewed = (review && changed.get(review)) || session.files.find((f) => f.after !== undefined) || session.files[0] || null;
  const failing = session.checks.filter((c) => c.status === "failed").length;

  async function merge() {
    try {
      await api.merge(session.id);
      refreshSessions();
      toast.success(`Merged #${session.pr?.number} into ${session.pr?.base ?? "main"}`);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Couldn’t merge. Try again.");
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        {session.pr && state ? (
          <MergeStatus
            number={session.pr.number}
            href={session.pr.url}
            state={state}
            checks={checksPending(session.checks) ? checkCounts(session.checks) : undefined}
            base={session.pr.base}
            onMerge={merge}
          />
        ) : (
          <p className={styles.noPr}>
            <Icon name="branch" className={styles.branchIcon} />
            <code className={styles.branch}>{session.branch}</code>
            <span className={styles.noPrNote}>{working ? "The pull request opens when the agent pushes." : "No pull request yet"}</span>
          </p>
        )}
      </div>

      <Tabs className={styles.tabs} value={tab} onValueChange={onTabChange}>
        <div className={styles.tabBar}>
          <TabList aria-label="Changes">
            <Tab value="files">All files</Tab>
            <Tab value="changes" count={session.files.length}>
              Changes
            </Tab>
            <Tab value="checks" count={failing || undefined}>
              Checks
            </Tab>
            <Tab value="review">Review</Tab>
          </TabList>
        </div>
        <TabPanels className={styles.panels}>
          <TabPanel value="files" className={styles.scroll}>
            <FileChanges files={all} label="All files" value={review} onValueChange={(path) => (changed.has(path) ? onReview(path) : undefined)} totals={false} />
          </TabPanel>
          <TabPanel value="changes" className={styles.scroll}>
            <FileChanges
              files={session.files}
              value={reviewed?.path ?? null}
              onValueChange={onReview}
              empty={
                <p className={styles.quiet}>{working ? "Files the agent changes show up here as it works." : "This session hasn’t changed any files."}</p>
              }
            />
          </TabPanel>
          <TabPanel value="checks" className={styles.scroll}>
            {session.checks.length ? (
              <ToolSteps steps={session.checks.map(checkAsStep)} label="Checks" defaultOpen />
            ) : (
              <p className={styles.quiet}>Checks run once the agent opens a pull request.</p>
            )}
          </TabPanel>
          <TabPanel value="review" className={styles.scroll}>
            {reviewed ? (
              <div className={styles.review}>
                <p className={styles.reviewPath}>
                  <FilePath path={reviewed.path} />
                </p>
                {reviewed.after !== undefined || reviewed.before !== undefined ? (
                  <DiffView before={reviewed.before ?? ""} after={reviewed.after ?? ""} name={reviewed.path.split("/").pop()} />
                ) : (
                  <p className={styles.quiet}>
                    No preview for this file in the sample. With your Git host connected, its diff shows here.
                  </p>
                )}
              </div>
            ) : (
              <EmptyState size="compact" art="search" title="Nothing to review yet" description="Pick a file in Changes, or wait for the agent to change one." />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
