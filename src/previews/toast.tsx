"use client";

import { useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Toaster, toast } from "@registry/toast/toast";
import styles from "./toast.module.css";

const LINE_ITEMS = [
  { id: "fence", label: "Lamb shoulder, 2 kg", amount: "$76.00" },
  { id: "posts", label: "White beans, 4 jars", amount: "$18.40" },
  { id: "gate", label: "Parsley, mint and capers", amount: "$9.60" },
  { id: "labor", label: "Red wine, 6 bottles", amount: "$108.00" },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ToastPreview() {
  const [items, setItems] = useState(LINE_ITEMS);
  const sends = useRef(0);

  function saveDraft() {
    toast.success("Draft saved");
  }

  function syncPrices() {
    toast.error("Couldn’t update grocery prices", {
      description: "The store’s price list didn’t load.",
      action: { label: "Retry", onClick: () => toast.success("Grocery prices updated") },
    });
  }

  function sendEstimate() {
    // Every other send fails, so both endings are easy to see.
    const attempt = ++sends.current;
    const send = wait(1600).then(() => {
      if (attempt % 2 === 0) throw new Error("bounced");
    });
    toast.promise(send, {
      loading: "Sending invitation…",
      success: "Invitation sent",
      error: "Invitation not sent",
      description: "To dana.whitfield@example.com",
      errorOptions: {
        description: "Dana’s inbox rejected it. Check the address.",
        action: { label: "Retry", onClick: sendEstimate },
      },
    });
  }

  function deleteItem(id: string) {
    const index = items.findIndex((i) => i.id === id);
    const item = items[index];
    if (!item) return;
    setItems((list) => list.filter((i) => i.id !== id));
    toast("Item removed", {
      description: item.label,
      action: {
        label: "Undo",
        onClick: () =>
          setItems((list) => {
            if (list.some((i) => i.id === id)) return list;
            const next = [...list];
            next.splice(Math.min(index, next.length), 0, item);
            return next;
          }),
      },
    });
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.heading}>Saturday supper</h2>
        <div className={styles.row}>
          <Button onClick={sendEstimate}>Send invitation</Button>
          <Button variant="secondary" onClick={saveDraft}>
            Save draft
          </Button>
          <Button variant="secondary" onClick={syncPrices}>
            Update prices
          </Button>
        </div>
      </section>

      <section className={styles.group}>
        <h3 className={styles.label}>Shopping list</h3>
        {items.length ? (
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemName}>{item.label}</span>
                <span className={styles.amount}>{item.amount}</span>
                <Button variant="ghost" className={styles.remove} onClick={() => deleteItem(item.id)} aria-label={`Remove ${item.label}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <p>The shopping list is empty.</p>
            <Button variant="secondary" onClick={() => setItems(LINE_ITEMS)}>
              Restore the list
            </Button>
          </div>
        )}
      </section>

      <p className={styles.note}>
        Send a few. Hover the stack to fan it out, drag or flick a toast sideways to dismiss it, and press F6, then
        Tab, to reach the newest one (Escape dismisses it). Every other send fails.
      </p>

      <Toaster />
    </div>
  );
}
