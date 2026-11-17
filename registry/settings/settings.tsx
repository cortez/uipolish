"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { Alert } from "../alert/alert";
import { Button } from "../button/button";
import { ConfirmDialog } from "../dialog/dialog";
import { Icon } from "../icons/icons";
import { Kbd } from "../kbd/kbd";
import { Skeleton, SkeletonText, useLoadingDelay } from "../skeleton/skeleton";
import { Tab, TabList, TabPanel, Tabs } from "../tabs/tabs";
import { ApiKeys } from "./api-keys";
import { General } from "./general";
import { Models } from "./models";
import { Notifications } from "./notifications";
import {
  FIELD_NAME,
  SECTION_OF,
  SettingsError,
  changes,
  listWords,
  message,
  plural,
  type ApiKey,
  type ApiKeyScope,
  type ModelFeature,
  type ModelOption,
  type NewApiKey,
  type SelectOption,
  type SettingsField,
  type SettingsNotifications,
  type SettingsPlanLimits,
  type SettingsSection,
  type SettingsUsage,
  type WorkspaceSettings,
} from "./shared";
import styles from "./settings.module.css";

export * from "./shared";

export type SettingsHandle = {
  /** Whether there are unsaved changes. */
  dirty: () => boolean;
  /** Before leaving the screen: resolves true at once when nothing is unsaved, else asks first and resolves with the answer. */
  confirmLeave: () => Promise<boolean>;
};

export type SettingsProps = {
  /** The saved values. Update them when `onSave` resolves, or leave them: the screen keeps what it saved. */
  settings: WorkspaceSettings;
  /** Saves what changed. The screen treats it as saved at once and rolls back if this rejects. Reject with `SettingsError` to put messages under fields. */
  onSave?: (patch: Partial<WorkspaceSettings>) => Promise<unknown>;
  /** False for people who can see the settings but not change them. */
  canEdit?: boolean;
  /** Says who can change them, shown to people who can't. */
  permissionNote?: ReactNode;
  /** The first load: a skeleton holds the panel's place after 300ms. */
  loading?: boolean;
  title?: string;
  description?: ReactNode;
  /** Your product's name, used in sentences: "Keys let your code call the Acme API". Default "Acme". */
  product?: string;

  /** Shown before the slug: "app.acme.ai/". */
  urlPrefix?: string;
  timezones: SelectOption[];
  locales: SelectOption[];
  logoUrl?: string | null;
  /** Uploads the logo and resolves once `logoUrl` is the new one. */
  onLogoUpload?: (file: File) => Promise<unknown>;
  onLogoRemove?: () => Promise<unknown>;
  /** Shows Delete workspace. Resolve once it's gone; take the person elsewhere then. */
  onDeleteWorkspace?: () => Promise<unknown>;
  /** What deleting takes with it, in your own words. */
  deleteNote?: string;

  apiKeys?: ApiKey[];
  scopes?: ApiKeyScope[];
  /** Resolves with the new key and its secret, which is shown once. Add the key to `apiKeys`. */
  onCreateKey?: (input: NewApiKey) => Promise<{ key: ApiKey; secret: string }>;
  /** Remove the key from `apiKeys` when it resolves. */
  onRevokeKey?: (id: string) => Promise<unknown>;
  /** Keys unused this long are flagged. Default 90. */
  staleDays?: number;

  models: ModelOption[];
  /** Features that can run on their own model. */
  features?: ModelFeature[];
  usage?: SettingsUsage;
  plan?: SettingsPlanLimits;
  /** ISO 4217. Default "USD". */
  currency?: string;
  /** For numbers and money. Default "en-US", fixed so server and browser agree. */
  numberLocale?: string;

  notifications?: SettingsNotifications;

  /** Which sections, in order. Default all four. */
  sections?: SettingsSection[];
  section?: SettingsSection;
  defaultSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  /** Hear when unsaved changes appear and go, to guard your router. */
  onDirtyChange?: (dirty: boolean) => void;
  /** The clock for "3 hours ago" and stale keys. Defaults to when the screen mounts. */
  now?: number;
  ref?: Ref<SettingsHandle>;
  className?: string;
};

const ALL: SettingsSection[] = ["general", "api-keys", "models", "notifications"];
const TAB_LABEL: Record<SettingsSection, string> = {
  general: "General",
  "api-keys": "API keys",
  models: "Models",
  notifications: "Notifications",
};

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;

function validate(v: WorkspaceSettings): Partial<Record<SettingsField, string>> {
  const out: Partial<Record<SettingsField, string>> = {};
  const name = v.name.trim();
  if (!name) out.name = "Give the workspace a name";
  else if (name.length > 48) out.name = `Keep it to 48 characters; this is ${name.length}`;
  if (!v.slug) out.slug = "Choose a URL for the workspace";
  else if (v.slug.length < 3 || v.slug.length > 32) out.slug = "Use 3 to 32 characters";
  else if (!SLUG.test(v.slug)) out.slug = "Use lowercase letters, numbers and hyphens, starting and ending with a letter or number";
  else if (v.slug.includes("--")) out.slug = "Use one hyphen at a time";
  return out;
}

type Bar = "hidden" | "dirty" | "saving" | "failed" | "saved";

/** A workspace's settings screen: general, API keys, models and limits, and notifications, with one save bar. */
export function Settings({
  settings,
  onSave,
  canEdit = true,
  permissionNote,
  loading = false,
  title = "Settings",
  product = "Acme",
  description,
  urlPrefix = "",
  timezones,
  locales,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
  onDeleteWorkspace,
  deleteNote,
  apiKeys = [],
  scopes = [],
  onCreateKey,
  onRevokeKey,
  staleDays = 90,
  models,
  features = [],
  usage,
  plan = {},
  currency = "USD",
  numberLocale = "en-US",
  notifications,
  sections = ALL,
  section: controlledSection,
  defaultSection,
  onSectionChange,
  onDirtyChange,
  now: nowProp,
  ref,
  className,
}: SettingsProps) {
  const id = useId();
  const fieldId = useCallback((field: SettingsField) => `${id}-field-${field}`, [id]);
  const readOnly = !canEdit;
  const shown = sections.filter((s) => s !== "notifications" || notifications);

  const [mountedAt] = useState(() => Date.now());
  const now = nowProp ?? mountedAt;

  /* Section */
  const [ownSection, setOwnSection] = useState<SettingsSection>(defaultSection ?? shown[0] ?? "general");
  const section = controlledSection ?? ownSection;
  const go = useCallback(
    (next: SettingsSection) => {
      if (controlledSection === undefined) setOwnSection(next);
      onSectionChange?.(next);
    },
    [controlledSection, onSectionChange],
  );

  /* Saved and draft. `saved` runs ahead of `settings` while a save is in flight. */
  const [prop, setProp] = useState(settings);
  const [saved, setSaved] = useState(settings);
  const [draft, setDraft] = useState(settings);
  if (prop !== settings) {
    // New values from outside: take them wherever the person hasn't changed anything.
    setProp(settings);
    setSaved(settings);
    setDraft((d) => {
      const next = { ...settings };
      for (const c of changes(saved, d)) {
        if (c.field === "overrides") next.overrides = d.overrides;
        else (next as Record<string, unknown>)[c.field] = d[c.field];
      }
      return next;
    });
  }

  const pending = changes(saved, draft);
  const dirty = canEdit && pending.length > 0;
  const dirtySections = new Set(pending.map((c) => SECTION_OF[c.field]));

  const [touched, setTouched] = useState<ReadonlySet<SettingsField>>(() => new Set());
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<SettingsField, string>>>({});
  const clientErrors = validate(draft);
  const errors: Partial<Record<SettingsField, string>> = {};
  for (const f of Object.keys(SECTION_OF) as SettingsField[]) {
    const e = serverErrors[f] ?? ((attempted || touched.has(f)) && clientErrors[f]);
    if (e) errors[f] = e;
  }

  const set = useCallback(<F extends SettingsField>(field: F, value: WorkspaceSettings[F]) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setServerErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }, []);
  const touch = useCallback((field: SettingsField) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field))), []);

  /* Saving */
  const [saving, setSaving] = useState<number | null>(null);
  const [failure, setFailure] = useState<{ text: string; fields: boolean } | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusField, setFocusField] = useState<SettingsField | null>(null);

  // Moves to an invalid field once its panel shows.
  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(fieldId(focusField));
    const target = el?.matches("input, button, select, textarea") ? el : el?.querySelector<HTMLElement>("input, button");
    target?.focus();
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(() => setFocusField(null), 0);
    return () => window.clearTimeout(t);
  }, [focusField, fieldId]);

  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 2000);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  function firstOf(fields: SettingsField[]) {
    const order = Object.keys(SECTION_OF) as SettingsField[];
    return order.find((f) => fields.includes(f)) ?? null;
  }

  async function save() {
    if (!onSave || !dirty || saving !== null) return;
    const invalid = Object.keys(clientErrors) as SettingsField[];
    if (invalid.length) {
      setAttempted(true);
      const first = firstOf(invalid);
      if (first) {
        go(SECTION_OF[first]);
        setFocusField(first);
      }
      return;
    }
    const patch: Partial<WorkspaceSettings> = {};
    for (const c of pending) (patch as Record<string, unknown>)[c.field] = draft[c.field];
    const before = saved;
    const snapshot = draft;
    // Optimistic: the bar and the section dots clear at once.
    setSaved(snapshot);
    setSaving(pending.length);
    setFailure(null);
    setServerErrors({});
    try {
      await onSave(patch);
      setJustSaved(true);
      setAttempted(false);
      setAnnouncement(`Saved ${plural(pending.length, "change")}.`);
    } catch (reason) {
      setSaved(before);
      const fields = reason instanceof SettingsError ? reason.fields : {};
      setServerErrors(fields);
      const first = firstOf(Object.keys(fields) as SettingsField[]);
      if (first) {
        go(SECTION_OF[first]);
        setFocusField(first);
      }
      const text = message(reason, `Couldn’t save. Your changes are still here; try again.`);
      setFailure({ text, fields: Object.keys(fields).length > 0 });
      setAnnouncement(`Not saved. ${text}`);
    } finally {
      setSaving(null);
    }
  }

  function discard() {
    setDraft(saved);
    setFailure(null);
    setServerErrors({});
    setAttempted(false);
    setTouched(new Set());
    setAnnouncement("Changes discarded.");
  }

  const invalidFields = Object.keys(clientErrors) as SettingsField[];
  const shownFailure =
    attempted && invalidFields.length
      ? `Fix the ${listWords(invalidFields.map((f) => FIELD_NAME[f]))} before saving.`
      : // A failure about fields goes once they've all been changed.
        failure && !(failure.fields && Object.keys(serverErrors).length === 0)
        ? failure.text
        : null;

  const bar: Bar = saving !== null ? "saving" : shownFailure && dirty ? "failed" : dirty ? "dirty" : justSaved ? "saved" : "hidden";

  /* Leaving */
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const [leaving, setLeaving] = useState(false);
  const leaveAnswer = useRef<((leave: boolean) => void) | null>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  });

  useImperativeHandle(
    ref,
    () => ({
      dirty: () => dirtyRef.current,
      confirmLeave: () => {
        if (!dirtyRef.current) return Promise.resolve(true);
        leaveAnswer.current?.(false);
        setLeaving(true);
        return new Promise<boolean>((resolve) => {
          leaveAnswer.current = resolve;
        });
      },
    }),
    [],
  );

  function answerLeave(leave: boolean) {
    leaveAnswer.current?.(leave);
    leaveAnswer.current = null;
  }

  // ⌘S or Ctrl+S saves from anywhere on the page while something is unsaved.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (!dirty) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty]);

  const announce = useCallback((text: string) => setAnnouncement(text), []);
  const skeleton = useLoadingDelay(loading);
  const pendingNames = Array.from(new Set(pending.map((c) => FIELD_NAME[c.field])));
  const workspace = saved.name;

  function panel(s: SettingsSection) {
    const headingId = `${id}-${s}`;
    switch (s) {
      case "general":
        return (
          <General
            headingId={headingId}
            product={product}
            draft={draft}
            savedName={workspace}
            set={set}
            touch={touch}
            errors={errors}
            fieldId={fieldId}
            readOnly={readOnly}
            urlPrefix={urlPrefix}
            timezones={timezones}
            locales={locales}
            logoUrl={logoUrl}
            onLogoUpload={onLogoUpload}
            onLogoRemove={onLogoRemove}
            onDeleteWorkspace={onDeleteWorkspace}
            deleteNote={deleteNote}
            announce={announce}
          />
        );
      case "api-keys":
        return (
          <ApiKeys
            headingId={headingId}
            product={product}
            workspace={workspace}
            keys={apiKeys}
            scopes={scopes}
            now={now}
            staleDays={staleDays}
            readOnly={readOnly}
            onCreate={onCreateKey}
            onRevoke={onRevokeKey}
            announce={announce}
          />
        );
      case "models":
        return (
          <Models
            headingId={headingId}
            workspace={workspace}
            draft={draft}
            set={set}
            errors={errors}
            fieldId={fieldId}
            readOnly={readOnly}
            models={models}
            features={features}
            usage={usage}
            plan={plan}
            currency={currency}
            numberLocale={numberLocale}
          />
        );
      case "notifications":
        return notifications ? (
          <Notifications
            {...notifications}
            headingId={headingId}
            product={product}
            workspace={workspace}
            readOnly={readOnly}
            announce={announce}
          />
        ) : null;
    }
  }

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{description ?? `Everything about ${workspace} that applies to the whole team.`}</p>
      </header>

      <Tabs orientation="vertical" value={section} onValueChange={(v) => go(v as SettingsSection)} className={styles.tabs}>
        <TabList aria-label="Settings sections" className={styles.tabList}>
          {shown.map((s) => (
            <Tab key={s} value={s} className={styles.tab}>
              <span className={styles.tabLabel}>
                {TAB_LABEL[s]}
                <span className={styles.tabDot} data-shown={dirtySections.has(s) || undefined} aria-hidden="true" />
                {dirtySections.has(s) && <span className={styles.srOnly}>, unsaved changes</span>}
              </span>
            </Tab>
          ))}
        </TabList>

        <div className={styles.main}>
          {readOnly && !loading && (
            <Alert tone="info" title="You can see these settings, but not change them" className={styles.permission}>
              {permissionNote ?? "Only owners and admins can change workspace settings."}
            </Alert>
          )}

          {shown.map((s) => (
            <TabPanel key={s} value={s} className={styles.panel} aria-labelledby={loading ? undefined : `${id}-${s}`}>
              {loading ? (
                <div className={styles.loading} role="status" aria-label={`Loading ${TAB_LABEL[s].toLowerCase()} settings`}>
                  {skeleton && <PanelSkeleton />}
                </div>
              ) : (
                panel(s)
              )}
            </TabPanel>
          ))}

          {canEdit && onSave && !loading && (
            <div className={styles.barSlot}>
              <SaveBar
                state={bar}
                names={pendingNames}
                count={saving ?? pending.length}
                failure={shownFailure}
                onSave={save}
                onDiscard={discard}
              />
            </div>
          )}
        </div>
      </Tabs>

      <ConfirmDialog
        open={leaving}
        onOpenChange={(open) => {
          setLeaving(open);
          if (!open) answerLeave(false);
        }}
        title="Leave without saving?"
        description={`Your changes to the ${listWords(pendingNames)} aren’t saved yet. Leave now and they’re gone.`}
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        onConfirm={() => {
          discard();
          answerLeave(true);
        }}
      />

      <span role="status" className={styles.srOnly}>
        {announcement}
      </span>
    </div>
  );
}

/* ---------- Save bar ---------- */

function SaveBar({
  state,
  names,
  count,
  failure,
  onSave,
  onDiscard,
}: {
  state: Bar;
  names: string[];
  count: number;
  failure: string | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  // Keeps its last words while it fades out, so it never empties first.
  const [last, setLast] = useState({ state, names, count, failure });
  if (
    state !== "hidden" &&
    (last.state !== state || last.count !== count || last.failure !== failure || last.names.join() !== names.join())
  ) {
    setLast({ state, names, count, failure });
  }
  const view = state === "hidden" ? last : { state, names, count, failure };

  let text: ReactNode;
  if (view.state === "failed") text = view.failure;
  else if (view.state === "saved") text = "Changes saved";
  else if (view.state === "saving") text = `Saving ${plural(view.count, "change")}…`;
  else text = view.count === 1 ? `Unsaved change to the ${view.names[0]}` : `${view.count} unsaved changes`;

  return (
    <div
      className={styles.bar}
      data-state={view.state}
      data-shown={state !== "hidden" || undefined}
      role="region"
      aria-label="Unsaved changes"
      inert={state === "hidden" || state === "saved" || undefined}
    >
      <p className={styles.barText}>
        {view.state === "failed" && <Icon name="alert" className={styles.barIcon} />}
        {view.state === "saved" && <Icon name="check" className={styles.barIcon} />}
        <span>{text}</span>
      </p>
      <div className={styles.barActions} data-hidden={view.state === "saved" || undefined}>
        {view.state === "dirty" && <Kbd keys={["mod", "S"]} className={styles.barKbd} />}
        <Button variant="ghost" onClick={onDiscard} disabled={view.state === "saving"}>
          Discard
        </Button>
        <Button busy={view.state === "saving"} busyLabel="Saving…" onClick={onSave}>
          {view.state === "failed" ? "Try again" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Loading ---------- */

function PanelSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonHead}>
        <SkeletonText size="2xl" width="8em" />
        <SkeletonText size="sm" width="22em" />
      </div>
      <div className={styles.skeletonRow}>
        <Skeleton width={48} height={48} radius="md" />
        <div className={styles.skeletonHead}>
          <SkeletonText width="4em" />
          <SkeletonText size="sm" width="16em" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={styles.skeletonField}>
          <SkeletonText size="sm" width="7em" />
          <Skeleton height={40} radius="md" />
          <SkeletonText size="sm" width="18em" />
        </div>
      ))}
      <div className={styles.skeletonPair}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.skeletonField}>
            <SkeletonText size="sm" width="6em" />
            <Skeleton height={40} radius="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
