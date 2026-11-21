"use client";

import { useState } from "react";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Icon } from "@registry/icons/icons";
import { Markdown } from "@registry/markdown/markdown";
import { Message, MessageThread } from "@registry/message-thread/message-thread";
import { SplitPane, SplitView } from "@registry/split-view/split-view";
import styles from "./preview.module.css";
import own from "./split-view.module.css";

const PLAN = `## Saturday supper for 12

A long table in the garden, food out by 7:30 and dessert by the fire.

### Menu

1. **To start**: burrata with roasted grapes and grilled bread
2. **Main**: lamb shoulder, slow-roasted for six hours, with salsa verde
3. **Sides**: crispy potatoes, charred broccolini with lemon
4. **For Amara**: a mushroom and leek galette, nut-free
5. **Dessert**: olive oil cake with whipped crème fraîche

### Timeline

| When | What |
|---|---|
| Friday, 8 pm | Bake the cake, salt the lamb |
| Saturday, 1 pm | Lamb into a 150°C oven |
| 6:30 pm | Potatoes in, table set |
| 7:30 pm | Everyone sits down |

> Theo can’t have shellfish: the salsa verde leaves out the anchovies this time.`;

const CHAT = [
  { id: "1", from: "user" as const, text: "Plan a supper for 12 on Saturday. Amara is allergic to nuts and Theo to shellfish." },
  {
    id: "2",
    from: "assistant" as const,
    text: "I drafted the plan in the document beside us: a slow lamb shoulder so the oven does the work, a nut-free galette for Amara, and no anchovies in the salsa verde for Theo.",
  },
  { id: "3", from: "user" as const, text: "Can dessert be something I make the day before?" },
  {
    id: "4",
    from: "assistant" as const,
    text: "Olive oil cake: it’s better on day two. I moved it to Friday night in the timeline, next to salting the lamb.",
  },
];

const ORDERS = [
  { id: "212", name: "Saturday supper", guests: 12, total: "$236.00", state: "Confirmed" },
  { id: "211", name: "Book club lunch", guests: 8, total: "$148.50", state: "Delivered" },
  { id: "209", name: "Harvest dinner", guests: 24, total: "$612.00", state: "Delivered" },
  { id: "207", name: "Wine tasting", guests: 10, total: "$94.00", state: "Refunded" },
];

function ChatAndDocument({ rtl }: { rtl: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [sizes, setSizes] = useState<number[] | null>(null);

  return (
    <div className={styles.group}>
      <div className={own.bar}>
        <span className={styles.label}>
          {sizes ? `Chat ${Math.round(sizes[0])}% · Document ${Math.round(sizes[1])}%` : "Drag the line, or Tab to it and use the arrows"}
        </span>
        <Button variant="secondary" className={own.hide} onClick={() => setHidden((h) => !h)}>
          <Icon name="panel" />
          {hidden ? "Show document" : "Hide document"}
        </Button>
      </div>
      <div className={own.frame} dir={rtl ? "rtl" : "ltr"}>
        <SplitView storageKey="preview-chat" onResize={setSizes}>
          <SplitPane id="chat" label="Chat" defaultSize="42%" minSize={280}>
            <MessageThread label="Supper planning">
              {CHAT.map((m) => (
                <Message key={m.id} from={m.from} text={m.text} actions={false} />
              ))}
            </MessageThread>
          </SplitPane>
          <SplitPane
            id="doc"
            label="Document"
            minSize={320}
            collapsible
            collapsed={hidden}
            onCollapsedChange={setHidden}
          >
            <article className={own.doc} aria-label="Saturday supper plan" tabIndex={0}>
              <Markdown source={PLAN} headingLevel={2} />
            </article>
          </SplitPane>
        </SplitView>
      </div>
    </div>
  );
}

function OrdersAndDetail({ rtl }: { rtl: boolean }) {
  const [selected, setSelected] = useState(ORDERS[0].id);
  // On a phone, picking an order shows it; the switch goes back to the list.
  const [pane, setPane] = useState("orders");
  const order = ORDERS.find((o) => o.id === selected) ?? ORDERS[0];

  return (
    <div className={styles.group}>
      <span className={styles.label}>A list beside its detail, with the detail split again; the list folds away</span>
      <div className={own.frame} dir={rtl ? "rtl" : "ltr"}>
        <SplitView narrowPane={pane} onNarrowPaneChange={setPane}>
          <SplitPane id="orders" label="Orders" defaultSize={240} minSize={200} maxSize="50%" collapsible>
            <ul className={own.list} aria-label="Orders">
              {ORDERS.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={own.row}
                    aria-current={o.id === selected || undefined}
                    onClick={() => {
                      setSelected(o.id);
                      setPane("detail");
                    }}
                  >
                    <span className={own.rowTitle}>{o.name}</span>
                    <span className={own.rowMeta}>
                      #{o.id} · {o.guests} guests
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </SplitPane>
          <SplitPane id="detail" label="Order" minSize={260}>
            <SplitView orientation="vertical">
              <SplitPane id="summary" label="Summary" defaultSize="55%" minSize={120}>
                <div className={own.detail}>
                  <h3 className={own.title}>{order.name}</h3>
                  <dl className={own.facts}>
                    <div>
                      <dt>Order</dt>
                      <dd>#{order.id}</dd>
                    </div>
                    <div>
                      <dt>Guests</dt>
                      <dd>{order.guests}</dd>
                    </div>
                    <div>
                      <dt>Total</dt>
                      <dd>{order.total}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{order.state}</dd>
                    </div>
                  </dl>
                </div>
              </SplitPane>
              <SplitPane id="activity" label="Activity" minSize={96} collapsible>
                <div className={own.detail}>
                  <h3 className={own.title}>Activity</h3>
                  <ol className={own.log}>
                    <li>Mon 9:12 am · Order placed by you</li>
                    <li>Mon 9:40 am · market.example.com confirmed delivery for Friday</li>
                    <li>Tue 2:05 pm · Two more guests; lamb raised to 2.8 kg</li>
                    <li>Wed 8:30 am · Invoice sent to accounts@example.com</li>
                  </ol>
                </div>
              </SplitPane>
            </SplitView>
          </SplitPane>
        </SplitView>
      </div>
    </div>
  );
}

export function SplitViewPreview() {
  const [rtl, setRtl] = useState(false);
  return (
    <div className={styles.stack}>
      <ChatAndDocument rtl={rtl} />
      <OrdersAndDetail rtl={rtl} />
      <div className={styles.row}>
        <Checkbox label="Right to left" checked={rtl} onCheckedChange={setRtl} />
      </div>
    </div>
  );
}
