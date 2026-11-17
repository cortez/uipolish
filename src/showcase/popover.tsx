"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { NumberInput } from "@registry/number-input/number-input";
import { Popover } from "@registry/popover/popover";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [deposit, setDeposit] = useState(25);
  const [draft, setDraft] = useState(deposit);

  return (
    <Popover
      label="Edit deposit"
      onOpenChange={(open) => open && setDraft(deposit)}
      trigger={<Button variant="secondary">Deposit: ${deposit}</Button>}
    >
      {({ close }) => (
        <div className={styles.stack}>
          <NumberInput
            label="Deposit per guest"
            value={draft}
            onValueChange={setDraft}
            min={0}
            step={5}
            format={{ style: "currency", currency: "USD" }}
          />
          <div className={styles.row}>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDeposit(draft);
                close();
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}
