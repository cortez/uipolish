"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../button/button";
import { Dialog, DialogActions } from "../dialog/dialog";
import { Icon } from "../icons/icons";
import { Select, type SelectOption } from "../select/select";
import { TextField } from "../text-field/text-field";
import { Group, SectionHead } from "./parts";
import { message, type SettingsField, type WorkspaceSettings } from "./shared";
import styles from "./settings.module.css";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const LOGO_MAX = 1_000_000;

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toLocaleUpperCase();
}

export type GeneralProps = {
  headingId: string;
  product: string;
  draft: WorkspaceSettings;
  /** The saved name, for sentences about the workspace as it is. */
  savedName: string;
  set: <F extends SettingsField>(field: F, value: WorkspaceSettings[F]) => void;
  touch: (field: SettingsField) => void;
  errors: Partial<Record<SettingsField, string>>;
  fieldId: (field: SettingsField) => string;
  readOnly: boolean;
  urlPrefix: string;
  timezones: SelectOption[];
  locales: SelectOption[];
  logoUrl?: string | null;
  onLogoUpload?: (file: File) => Promise<unknown>;
  onLogoRemove?: () => Promise<unknown>;
  onDeleteWorkspace?: () => Promise<unknown>;
  deleteNote?: string;
  announce: (text: string) => void;
};

export function General({
  headingId,
  product,
  draft,
  savedName,
  set,
  touch,
  errors,
  fieldId,
  readOnly,
  urlPrefix,
  timezones,
  locales,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
  onDeleteWorkspace,
  deleteNote,
  announce,
}: GeneralProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLButtonElement>(null);
  const [logoBusy, setLogoBusy] = useState<"upload" | "remove" | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !onLogoUpload) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError(`${file.name} isn’t an image. Use a PNG, JPG, SVG or WebP.`);
      return;
    }
    if (file.size > LOGO_MAX) {
      setLogoError(`${file.name} is ${(file.size / 1_000_000).toFixed(1)} MB. Use one under 1 MB.`);
      return;
    }
    setLogoError(null);
    setLogoBusy("upload");
    try {
      await onLogoUpload(file);
      announce("Logo uploaded.");
    } catch (reason) {
      setLogoError(message(reason, `Couldn’t upload ${file.name}. Your logo hasn’t changed; try again.`));
    } finally {
      setLogoBusy(null);
    }
  }

  async function remove() {
    if (!onLogoRemove) return;
    setLogoError(null);
    setLogoBusy("remove");
    try {
      await onLogoRemove();
      announce("Logo removed.");
      uploadRef.current?.focus();
    } catch (reason) {
      setLogoError(message(reason, "Couldn’t remove the logo. It’s still there; try again."));
    } finally {
      setLogoBusy(null);
    }
  }

  /* Delete, with the name typed to confirm. */
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  function openDelete() {
    setTyped("");
    setTypedError(null);
    setDeleteError(null);
    setDeleting(true);
  }

  async function confirmDelete() {
    if (!onDeleteWorkspace || deleteBusy) return;
    if (typed.trim() !== savedName) {
      setTypedError(`Type ${savedName} exactly, with the same capitals`);
      return;
    }
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await onDeleteWorkspace();
      setDeleting(false);
    } catch (reason) {
      setDeleteError(message(reason, `Couldn’t delete ${savedName}. Nothing was deleted; try again.`));
    } finally {
      setDeleteBusy(false);
    }
  }

  const canUpload = !readOnly && Boolean(onLogoUpload);

  return (
    <>
      <SectionHead id={headingId} title="General" intro={`How ${savedName} looks and where it lives.`} />

      <div className={styles.form} data-readonly={readOnly || undefined}>
        <div className={styles.logoRow}>
          <span className={styles.logoTile} data-image={logoUrl ? "" : undefined} aria-hidden="true">
            {logoUrl ? (
              // A user's own upload, any size; the tile crops it.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.logoImg} src={logoUrl} alt="" width={48} height={48} />
            ) : (
              <span className={styles.logoText}>{initials(savedName)}</span>
            )}
          </span>
          <div className={styles.logoText2}>
            <span id={`${id}-logo`} className={styles.label}>
              Logo
            </span>
            <p id={`${id}-logo-message`} className={styles.description} data-tone={logoError ? "danger" : undefined} aria-live="polite">
              {logoError ??
                (canUpload
                  ? "Square, PNG, JPG or SVG, under 1 MB. Saves as soon as it uploads."
                  : logoUrl
                    ? "Shown in the sidebar and in emails."
                    : "No logo yet. The initials stand in.")}
            </p>
          </div>
          {canUpload && (
            <div className={styles.logoActions}>
              <input
                ref={inputRef}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className={styles.srOnly}
                tabIndex={-1}
                aria-hidden="true"
                onChange={pick}
              />
              <Button
                ref={uploadRef}
                variant="secondary"
                busy={logoBusy === "upload"}
                busyLabel="Uploading…"
                aria-describedby={`${id}-logo-message`}
                onClick={() => inputRef.current?.click()}
              >
                <Icon name="upload" />
                {logoUrl ? "Replace" : "Upload logo"}
              </Button>
              {logoUrl && onLogoRemove && (
                <Button variant="ghost" busy={logoBusy === "remove"} onClick={remove}>
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>

        <TextField
          id={fieldId("name")}
          label="Workspace name"
          value={draft.name}
          readOnly={readOnly}
          hint={`Shown in the sidebar, on invoices and in every email ${product} sends your team.`}
          error={errors.name ?? null}
          maxLength={64}
          autoComplete="organization"
          onChange={(e) => set("name", e.currentTarget.value)}
          onBlur={() => touch("name")}
        />

        <TextField
          id={fieldId("slug")}
          label="URL"
          value={draft.slug}
          readOnly={readOnly}
          hint={`${urlPrefix}${draft.slug || "your-workspace"}. Old links redirect for 30 days after a change.`}
          error={errors.slug ?? null}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.mono}
          onChange={(e) => set("slug", e.currentTarget.value.toLowerCase().replace(/\s+/g, "-"))}
          onBlur={() => touch("slug")}
        />

        <div className={styles.pair}>
          <Select
            id={fieldId("timezone")}
            label="Time zone"
            options={timezones}
            value={draft.timezone}
            disabled={readOnly}
            hint="Schedules and monthly resets use it."
            error={errors.timezone ?? null}
            onValueChange={(v) => set("timezone", v)}
          />
          <Select
            id={fieldId("locale")}
            label="Language and region"
            options={locales}
            value={draft.locale}
            disabled={readOnly}
            hint="Dates, numbers and emails."
            error={errors.locale ?? null}
            onValueChange={(v) => set("locale", v)}
          />
        </div>
      </div>

      {onDeleteWorkspace && !readOnly && (
        <Group id={`${id}-danger`} title="Delete workspace">
          <div className={styles.danger}>
            <p className={styles.dangerText}>
              {deleteNote ??
                `Deletes ${savedName} for everyone: its API keys, run history, files and settings. Members lose access straight away. This can’t be undone.`}
            </p>
            <Button ref={deleteButton} variant="danger" onClick={openDelete} className={styles.dangerButton}>
              Delete workspace
            </Button>
          </div>
        </Group>
      )}

      {onDeleteWorkspace && (
        <Dialog
          open={deleting}
          onOpenChange={setDeleting}
          role="alertdialog"
          size="sm"
          title={`Delete ${savedName}?`}
          description="Its API keys stop working at once, and its runs, files and settings are gone for good."
          locked={deleteBusy}
          triggerRef={deleteButton}
          footer={
            <>
              <p className={styles.dialogError} role="alert">
                {deleteError}
              </p>
              <DialogActions>
                <Button variant="secondary" disabled={deleteBusy} onClick={() => setDeleting(false)}>
                  Keep workspace
                </Button>
                <Button variant="danger" busy={deleteBusy} busyLabel="Deleting…" onClick={confirmDelete}>
                  Delete workspace
                </Button>
              </DialogActions>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}
          >
            <TextField
              label={`Type ${savedName} to confirm`}
              value={typed}
              autoComplete="off"
              spellCheck={false}
              error={typedError}
              onChange={(e) => {
                setTyped(e.currentTarget.value);
                if (typedError && e.currentTarget.value.trim() === savedName) setTypedError(null);
              }}
            />
          </form>
        </Dialog>
      )}
    </>
  );
}
