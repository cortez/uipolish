"use client";

import { useState } from "react";
import { DiffView } from "@registry/diff-view/diff-view";
import { FileChanges, FileChip, type FileChange } from "@registry/file-changes/file-changes";
import { SegmentedControl, Segment } from "@registry/segmented-control/segmented-control";
import styles from "./preview.module.css";
import own from "./file-changes.module.css";

/* A pull request's files beside the diff of the one picked: arrow keys
   move the selection and the diff follows. Under it, files named inline as
   chips, and the list's loading and empty states. */

type File = FileChange & { before?: string; after?: string };

const FILES: File[] = [
  {
    path: "tests/e2e/checkout.spec.ts",
    kind: "modified",
    added: 3,
    removed: 2,
    before: `test("pays for a cart", async ({ page }) => {\n  await fillCard(page, TEST_CARD);\n  await page.waitForTimeout(500);\n  await page.getByRole("button", { name: "Pay" }).click();\n});\n`,
    after: `test("pays for a cart", async ({ page }) => {\n  await fillCard(page, TEST_CARD);\n  const pay = page.getByRole("button", { name: "Pay" });\n  await expect(pay).toBeEnabled({ timeout: 5_000 });\n  await pay.click();\n});\n`,
  },
  { path: "src/checkout/payment-form.tsx", kind: "modified", added: 9, removed: 3 },
  { path: "src/checkout/use-cart-total.ts", kind: "modified", added: 14, removed: 7 },
  { path: "tests/e2e/fixtures/slow-tax.ts", kind: "added", added: 22, removed: 0 },
  { path: "src/webhooks/send.ts", kind: "renamed", from: "src/webhooks/deliver.ts", added: 14, removed: 9 },
  { path: "src/invoices/pdf/components/legacy/legacy-render.tsx", kind: "deleted", added: 0, removed: 142 },
];

export function FileChangesPreview() {
  const [selected, setSelected] = useState(FILES[0].path);
  const [state, setState] = useState("files");
  const file = FILES.find((f) => f.path === selected)!;

  return (
    <div className={styles.stack}>
      <div className={styles.group}>
        <SegmentedControl data-demo-controls="" aria-label="List state" value={state} onValueChange={setState} size="sm">
          <Segment value="files">Files</Segment>
          <Segment value="loading">Loading</Segment>
          <Segment value="empty">Empty</Segment>
        </SegmentedControl>
        <div className={own.frame}>
        <div className={own.split}>
          <FileChanges
            files={state === "empty" ? [] : FILES}
            loading={state === "loading"}
            value={selected}
            onValueChange={setSelected}
          />
          <div className={own.diff}>
            {file.before !== undefined ? (
              <DiffView before={file.before} after={file.after ?? ""} name={file.path.split("/").pop()} />
            ) : (
              <p className={styles.note}>Only the first file carries both versions in this demo. Pick it to see its diff.</p>
            )}
          </div>
        </div>
        </div>
      </div>
      <div className={styles.group}>
        <span className={styles.label}>Inline, as chips</span>
        <p className={own.sentence}>
          The test was racing the tax quote in <FileChip inline path="tests/e2e/checkout.spec.ts" onClick={() => setSelected("tests/e2e/checkout.spec.ts")} />, so I
          made it wait for Pay instead.
        </p>
        <div className={styles.row}>
          {FILES.slice(0, 4).map((f) => (
            <FileChip key={f.path} path={f.path} kind={f.kind} added={f.added} removed={f.removed} onClick={() => setSelected(f.path)} />
          ))}
        </div>
      </div>
    </div>
  );
}
