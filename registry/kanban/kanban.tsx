"use client";

import { useId, useRef, type ComponentProps, type ReactNode, type Ref } from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { ScrollArea } from "../scroll-area/scroll-area";
import { DRAG_MESSAGES, useDragSort, type DragMessages } from "../sortable-list/drag";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./kanban.module.css";

export type KanbanColumn = {
  id: string;
  title: string;
};

export type KanbanCard = {
  id: string;
  columnId: string;
  /** The card's name: its accessible name, and what moves are announced with. */
  title: string;
  /** A line or two under the title. */
  content?: ReactNode;
  /** A row at the foot: an avatar, a badge, a due date. */
  meta?: ReactNode;
  /** Makes the card a link (when there's no `onOpen`). */
  href?: string;
};

type KanbanMessages = DragMessages & {
  instructions: string;
  /** The add button's name: "Add a card to Quoted". */
  add: (column: string) => string;
  /** What an empty column says. */
  empty: string;
};

const MESSAGES: KanbanMessages = {
  ...DRAG_MESSAGES,
  instructions:
    "Press Space to pick up. Use the arrow keys to move within a column, Left and Right to move between columns, Space to drop, Escape to cancel.",
  add: (column) => `Add a card to ${column}`,
  empty: "Nothing here yet",
};

type KanbanProps = Omit<ComponentProps<"div">, "children"> & {
  columns: readonly KanbanColumn[];
  /** Every card; a column shows its own in the order they come here. */
  cards: readonly KanbanCard[];
  /** A card moved: to which column, and its index there. Apply it to your state; until then nothing changes. */
  onMove: (cardId: string, toColumnId: string, toIndex: number) => void;
  /** Makes each card a button that opens it. Space still picks it up; Enter and a click open. */
  onOpen?: (card: KanbanCard) => void;
  /** Shows a "+" in each column's header. */
  onAdd?: (columnId: string) => void;
  /** The words read to screen readers, for another language. */
  messages?: Partial<KanbanMessages>;
  /** The board: the element that scrolls sideways. */
  ref?: Ref<HTMLDivElement>;
};

/** Columns of cards that move within and between columns by drag or keyboard. */
export function Kanban({ columns, cards, onMove, onOpen, onAdd, messages, className, ref, ...props }: KanbanProps) {
  const id = useId();
  const instructionsId = `${id}-instructions`;
  const boardRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const words = { ...MESSAGES, ...messages };

  const byId = new Map(cards.map((c) => [c.id, c]));
  const titles = new Map(columns.map((c) => [c.id, c.title]));

  useDragSort(boardRef, {
    onDrop: ({ key, to }) => onMove(key, to.container, to.index),
    labelOf: (key) => byId.get(key)?.title ?? key,
    containerLabelOf: (column) => titles.get(column) ?? column,
    messages: words,
    status: statusRef,
    overlayClass: styles.layer,
    across: true,
  });

  function setRefs(node: HTMLDivElement | null) {
    boardRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  return (
    <div role="group" className={className ? `${styles.root} ${className}` : styles.root} {...props}>
      <div ref={setRefs} className={styles.board}>
        {columns.map((column) => {
          const own = cards.filter((c) => c.columnId === column.id);
          const titleId = `${id}-${column.id}`;
          return (
            <section key={column.id} className={styles.column} data-drag-lane="" aria-labelledby={titleId}>
              <header className={styles.header}>
                <h3 id={titleId} className={styles.title}>
                  {column.title}
                </h3>
                <span className={styles.count}>
                  <TextMorph>{String(own.length)}</TextMorph>
                </span>
                {onAdd && (
                  <Button variant="ghost" size="sm" className={styles.add} aria-label={words.add(column.title)} onClick={() => onAdd(column.id)}>
                    <Icon name="plus" />
                  </Button>
                )}
              </header>
              <ScrollArea className={styles.scroll}>
                <ul role="list" className={styles.cards} data-drag-container={column.id} aria-labelledby={titleId}>
                  {own.map((card) => (
                    <Card key={card.id} card={card} onOpen={onOpen} instructions={instructionsId} />
                  ))}
                </ul>
                {own.length === 0 && (
                  <p className={styles.empty} aria-hidden="true">
                    {words.empty}
                  </p>
                )}
              </ScrollArea>
            </section>
          );
        })}
      </div>
      <span className={styles.srOnly}>
        <span id={instructionsId}>{words.instructions}</span>
        <span ref={statusRef} role="status" />
      </span>
    </div>
  );
}

function Card({ card, onOpen, instructions }: { card: KanbanCard; onOpen?: (card: KanbanCard) => void; instructions: string }) {
  const id = useId();
  const detailId = `${id}-detail`;
  const describedBy = [(card.content != null || card.meta != null) && detailId, instructions].filter(Boolean).join(" ");
  const title = <span className={styles.cardTitle}>{card.title}</span>;

  let grip: ReactNode;
  if (onOpen) {
    grip = (
      <button type="button" className={styles.grip} data-drag-handle="" aria-describedby={describedBy} onClick={() => onOpen(card)}>
        {title}
      </button>
    );
  } else if (card.href !== undefined) {
    grip = (
      <a href={card.href} className={styles.grip} data-drag-handle="" aria-describedby={describedBy} draggable={false}>
        {title}
      </a>
    );
  } else {
    // Nothing to open: still one tab stop, so the keyboard can pick it up.
    grip = (
      <span role="button" tabIndex={0} className={styles.grip} data-drag-handle="" aria-roledescription="draggable card" aria-describedby={describedBy}>
        {title}
      </span>
    );
  }

  return (
    <li className={styles.card} data-drag-key={card.id} data-opens={onOpen || card.href !== undefined ? "" : undefined}>
      {grip}
      {(card.content != null || card.meta != null) && (
        <div id={detailId} className={styles.detail}>
          {card.content != null && <div className={styles.content}>{card.content}</div>}
          {card.meta != null && <div className={styles.meta}>{card.meta}</div>}
        </div>
      )}
    </li>
  );
}
