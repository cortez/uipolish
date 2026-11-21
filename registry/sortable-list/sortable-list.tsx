"use client";

import {
  Children,
  createContext,
  isValidElement,
  use,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";
import { Icon } from "../icons/icons";
import { DRAG_MESSAGES, useDragSort, type DragMessages } from "./drag";
import styles from "./sortable-list.module.css";

type SortableMessages = DragMessages & {
  /** The handle's name: "Move Olive oil cake". */
  handle: (label: string) => string;
};

const MESSAGES: SortableMessages = { ...DRAG_MESSAGES, handle: (label) => `Move ${label}` };

type SortableListProps<T> = Omit<ComponentProps<"ul">, "children"> & {
  /** The items, in order. Each becomes a row through `renderItem`. */
  items?: readonly T[];
  /** A stable key for an item. Defaults to its `id`. */
  getKey?: (item: T) => string;
  /** Returns the item's `SortableItem`. */
  renderItem?: (item: T, index: number) => ReactNode;
  /** Or the rows themselves: `SortableItem`s, each with a `key`. */
  children?: ReactNode;
  /** An item moved from one index to another. Apply it to your state; until then nothing changes. */
  onReorder: (from: number, to: number) => void;
  /** `true` (default): rows lift by a handle at their start. `false`: by the whole row; a finger holds first, so the list still scrolls. */
  handle?: boolean;
  /** `box` (default) has a rounded surface; `plain` has none. */
  variant?: "box" | "plain";
  /** The words read to screen readers, for another language. */
  messages?: Partial<SortableMessages>;
  ref?: Ref<HTMLUListElement>;
};

type ItemContextValue = {
  dragKey: string;
  handle: boolean;
  variant: "box" | "plain";
  instructions: string;
  messages: SortableMessages;
};

const ItemContext = createContext<ItemContextValue | null>(null);

const idOf = (item: unknown) => String((item as { id?: string | number }).id);

/** What a row is read as: its `label`, else its title when that's text. */
function labelOf(node: ReactNode, key: string) {
  if (!isValidElement<{ label?: string; title?: ReactNode }>(node)) return key;
  const { label, title } = node.props;
  return label ?? (typeof title === "string" ? title : key);
}

/** A vertical list whose rows are put in order by dragging, or from the keyboard. */
export function SortableList<T>({
  items,
  getKey = idOf,
  renderItem,
  children,
  onReorder,
  handle = true,
  variant = "box",
  messages,
  className,
  ref,
  ...props
}: SortableListProps<T>) {
  const id = useId();
  const instructionsId = `${id}-instructions`;
  const listRef = useRef<HTMLUListElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const words = { ...MESSAGES, ...messages };

  const rows: { key: string; node: ReactNode }[] = [];
  if (items && renderItem) {
    items.forEach((item, index) => rows.push({ key: getKey(item), node: renderItem(item, index) }));
  } else {
    // forEach, not toArray: it keeps each child's own key.
    Children.forEach(children, (child) => {
      if (isValidElement(child)) rows.push({ key: String(child.key), node: child });
    });
  }
  const labels = new Map(rows.map((r) => [r.key, labelOf(r.node, r.key)]));

  useDragSort(listRef, {
    onDrop: ({ from, to }) => onReorder(from.index, to.index),
    labelOf: (key) => labels.get(key) ?? key,
    messages: words,
    status: statusRef,
    overlayClass: styles.layer,
    enter: handle,
  });

  function setRefs(node: HTMLUListElement | null) {
    listRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  return (
    <>
      <ul
        ref={setRefs}
        // Safari drops list semantics from an unbulleted list unless the role is stated.
        role="list"
        data-drag-container=""
        data-variant={variant}
        className={className ? `${styles.list} ${className}` : styles.list}
        {...props}
      >
        {rows.map(({ key, node }) => (
          <ItemContext key={key} value={{ dragKey: key, handle, variant, instructions: instructionsId, messages: words }}>
            {node}
          </ItemContext>
        ))}
      </ul>
      <span className={styles.srOnly}>
        <span id={instructionsId}>{words.instructions}</span>
        <span ref={statusRef} role="status" />
      </span>
    </>
  );
}

type SortableItemProps = Omit<ComponentProps<"li">, "title"> & {
  /** Avatar, icon or thumbnail; decorative. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** A value at the end: a time, a count, a badge. */
  trailing?: ReactNode;
  /** Secondary actions (use `ListAction` from List). */
  actions?: ReactNode;
  /** What the row is read as when `title` isn't plain text. */
  label?: string;
  /** Can’t be picked up; the others can still move around it. */
  disabled?: boolean;
};

/** One row of a `SortableList`. */
export function SortableItem({ leading, title, description, trailing, actions, label, disabled = false, className, ...props }: SortableItemProps) {
  const ctx = use(ItemContext);
  if (!ctx) throw new Error("SortableItem goes inside a SortableList.");
  const id = useId();
  const descriptionId = `${id}-description`;
  const name = label ?? (typeof title === "string" ? title : ctx.dragKey);
  const describedBy = [description != null && descriptionId, ctx.instructions].filter(Boolean).join(" ");

  const titleText = <span className={styles.title}>{title}</span>;

  return (
    <li
      className={className ? `${styles.row} ${className}` : styles.row}
      data-drag-key={ctx.dragKey}
      data-drag-grab={ctx.handle ? "handle" : "row"}
      data-drag-disabled={disabled || undefined}
      data-variant={ctx.variant}
      // The whole row lifts: it fills on hover and presses like a list row.
      data-interactive={(!ctx.handle && !disabled) || undefined}
      data-disabled={disabled || undefined}
      {...props}
    >
      {ctx.handle && (
        <button
          type="button"
          className={styles.handle}
          data-drag-handle=""
          aria-label={ctx.messages.handle(name)}
          aria-describedby={ctx.instructions}
          disabled={disabled}
        >
          <Icon name="grip" />
        </button>
      )}
      {leading != null && <span className={styles.leading}>{leading}</span>}
      <span className={styles.main}>
        <span className={styles.text}>
          {ctx.handle ? (
            <span className={styles.primary}>{titleText}</span>
          ) : (
            <span
              role="button"
              tabIndex={disabled ? undefined : 0}
              className={`${styles.primary} ${styles.grab}`}
              data-drag-handle=""
              aria-roledescription="sortable item"
              aria-disabled={disabled || undefined}
              aria-describedby={describedBy}
            >
              {titleText}
            </span>
          )}
          {description != null && (
            <span id={descriptionId} className={styles.description}>
              {description}
            </span>
          )}
        </span>
        {trailing != null && <span className={styles.trailing}>{trailing}</span>}
        {actions != null && <span className={styles.actions}>{actions}</span>}
      </span>
    </li>
  );
}
