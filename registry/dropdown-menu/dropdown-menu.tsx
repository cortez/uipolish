"use client";

import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Icon } from "../icons/icons";
import { TextMorph } from "../text-morph/text-morph";
import styles from "./dropdown-menu.module.css";

/* Behavior (focus, keyboard, typeahead, submenus and their safe triangle,
   dismissal, positioning) comes from Base UI's Menu. This file keeps the look:
   one highlight that slides between items, the held width, busy and morphing
   labels. */

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

type RootApi = { close: () => void };

const RootContext = createContext<RootApi | null>(null);
/** The themed subtree the trigger sits in, so portalled panels keep its tokens. */
const ContainerContext = createContext<HTMLElement | undefined>(undefined);

function useRoot() {
  const ctx = use(RootContext);
  if (!ctx) throw new Error("Menu items must be inside <DropdownMenu>.");
  return ctx;
}

const ITEM = "[data-menu-item]";

/** Moves the panel's one highlight under its highlighted item. */
function placeHighlight(popup: HTMLElement, bar: HTMLElement) {
  // Submenus are portalled, so every item in here belongs to this panel.
  // An open submenu's trigger keeps the highlight while its submenu has focus.
  const item =
    popup.querySelector<HTMLElement>(`${ITEM}[data-highlighted]`) ??
    popup.querySelector<HTMLElement>(`${ITEM}[data-popup-open]`);
  if (!item) {
    bar.removeAttribute("data-visible");
    return;
  }
  const jump = !bar.hasAttribute("data-visible");
  if (jump) bar.setAttribute("data-jump", "");
  bar.style.translate = `0 ${item.offsetTop}px`;
  bar.style.height = `${item.offsetHeight}px`;
  bar.dataset.tone = item.dataset.tone ?? "";
  bar.setAttribute("data-visible", "");
  if (jump) {
    bar.getBoundingClientRect();
    bar.removeAttribute("data-jump");
  }
}

/* ---------- Panel ---------- */

type PanelProps = {
  side: Side | "inline-end";
  align: Align;
  sideOffset: number;
  alignOffset?: number;
  className?: string;
  children: ReactNode;
};

function MenuPanel({ side, align, sideOffset, alignOffset = 0, className, children }: PanelProps) {
  const container = use(ContainerContext);
  return (
    <BaseMenu.Portal container={container}>
      <BaseMenu.Positioner
        className={styles.positioner}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={8}
      >
        <BaseMenu.Popup className={className ? `${styles.surface} ${className}` : styles.surface}>
          <Highlight />
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

/** Mounts with the popup, each time it opens. */
function Highlight() {
  const barRef = useRef<HTMLSpanElement>(null);

  // Hold the popup's width from now on, so a relabelled item never pulls the
  // edge in under the pointer; and keep the bar under whichever item Base UI
  // marks highlighted.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const popup = bar?.parentElement;
    if (!bar || !popup) return;
    popup.style.minWidth = `${popup.offsetWidth}px`;
    placeHighlight(popup, bar);
    const observer = new MutationObserver(() => placeHighlight(popup, bar));
    observer.observe(popup, { subtree: true, attributes: true, attributeFilter: ["data-highlighted", "data-popup-open"] });
    return () => observer.disconnect();
  }, []);

  return <span ref={barRef} className={styles.highlight} aria-hidden="true" />;
}

/* ---------- Root ---------- */

type DropdownMenuProps = {
  /** A button. It gets aria-haspopup, aria-expanded and aria-controls. */
  trigger: ReactElement;
  side?: Side;
  align?: Align;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: ReactNode;
};

export function DropdownMenu({
  trigger,
  side = "bottom",
  align = "start",
  open,
  onOpenChange,
  className,
  children,
}: DropdownMenuProps) {
  const actionsRef = useRef<BaseMenu.Root.Actions | null>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const container = triggerEl?.closest<HTMLElement>("[data-theme]") ?? undefined;
  const close = useCallback(() => actionsRef.current?.close(), []);

  return (
    <RootContext value={{ close }}>
      <ContainerContext value={container}>
        <BaseMenu.Root
          open={open}
          onOpenChange={(next) => onOpenChange?.(next)}
          actionsRef={actionsRef}
          modal={false}
        >
          <BaseMenu.Trigger ref={setTriggerEl} render={trigger} />
          <MenuPanel side={side} align={align} sideOffset={6} className={className}>
            {children}
          </MenuPanel>
        </BaseMenu.Root>
      </ContainerContext>
    </RootContext>
  );
}

/* ---------- Items ---------- */

type ItemCommon = {
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  /** A shortcut hint like "⌘D". Visual only. */
  shortcut?: string;
  /** The same shortcut for assistive tech, like "Meta+D". */
  keyshortcuts?: string;
  description?: ReactNode;
};

type ItemBodyProps = Omit<ItemCommon, "disabled" | "keyshortcuts"> & {
  id: string;
  leading?: ReactNode;
  /** Changes in place while the menu stays open; a string morphs. */
  morph?: boolean;
  trailing?: ReactNode;
};

function ItemBody({ id, leading, icon, shortcut, description, morph = false, trailing, children }: ItemBodyProps) {
  const morphing = morph && typeof children === "string";
  return (
    <>
      <span className={styles.leading} data-filled={leading || icon ? "" : undefined} aria-hidden="true">
        {leading ?? icon}
      </span>
      <span className={styles.text}>
        <span id={`${id}-label`} className={styles.label}>
          {morphing ? <TextMorph>{children as string}</TextMorph> : children}
        </span>
        {description && (
          <span id={`${id}-description`} className={styles.description}>
            {description}
          </span>
        )}
      </span>
      {shortcut && (
        <kbd className={styles.shortcut} aria-hidden="true">
          {shortcut}
        </kbd>
      )}
      {trailing}
    </>
  );
}

/** Props every item element shares. */
function itemProps(id: string, { children, description, keyshortcuts }: Pick<ItemCommon, "children" | "description" | "keyshortcuts">) {
  return {
    id,
    className: styles.item,
    "data-menu-item": "",
    // Typeahead reads this; a morphing label renders its text twice.
    label: typeof children === "string" ? children : undefined,
    "aria-labelledby": `${id}-label`,
    "aria-describedby": description ? `${id}-description` : undefined,
    "aria-keyshortcuts": keyshortcuts,
  };
}

type MenuItemProps = ItemCommon & {
  /** Runs when chosen; gets `close` when `closeOnSelect={false}`. */
  onSelect?: (menu: { close: () => void }) => void;
  /** `danger` for destructive actions like delete. */
  variant?: "default" | "danger";
  /** `false` keeps the menu open so the item can confirm in place. */
  closeOnSelect?: boolean;
  /** Work is running: presses are ignored and focus stays. */
  busy?: boolean;
};

export function MenuItem({
  onSelect,
  variant = "default",
  closeOnSelect = true,
  busy = false,
  disabled = false,
  ...props
}: MenuItemProps) {
  const root = useRoot();
  const id = useId();
  return (
    <BaseMenu.Item
      {...itemProps(id, props)}
      disabled={disabled}
      // Busy isn't disabled: it keeps focus but ignores presses.
      closeOnClick={closeOnSelect && !busy}
      data-tone={variant === "danger" ? "danger" : undefined}
      aria-busy={busy || undefined}
      onClick={() => {
        if (!busy) onSelect?.({ close: root.close });
      }}
    >
      <ItemBody id={id} {...props} morph={!closeOnSelect} />
    </BaseMenu.Item>
  );
}

type MenuCheckboxItemProps = ItemCommon & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Checkboxes keep the menu open by default. */
  closeOnSelect?: boolean;
};

export function MenuCheckboxItem({
  checked,
  onCheckedChange,
  closeOnSelect = false,
  disabled = false,
  ...props
}: MenuCheckboxItemProps) {
  const id = useId();
  return (
    <BaseMenu.CheckboxItem
      {...itemProps(id, props)}
      disabled={disabled}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      closeOnClick={closeOnSelect}
    >
      <ItemBody
        id={id}
        {...props}
        leading={<span className={styles.indicator}>{checked && <Icon name="check" />}</span>}
      />
    </BaseMenu.CheckboxItem>
  );
}

type MenuRadioGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Shown above the options and used as the group's name. */
  label?: string;
  children: ReactNode;
};

export function MenuRadioGroup({ value, onValueChange, label, children }: MenuRadioGroupProps) {
  return (
    <BaseMenu.RadioGroup
      className={styles.group}
      value={value}
      onValueChange={(next: string) => onValueChange(next)}
    >
      {label && <BaseMenu.GroupLabel className={styles.groupLabel}>{label}</BaseMenu.GroupLabel>}
      {children}
    </BaseMenu.RadioGroup>
  );
}

type MenuRadioItemProps = ItemCommon & {
  value: string;
  /** Radios close the menu by default. */
  closeOnSelect?: boolean;
};

export function MenuRadioItem({ value, closeOnSelect = true, disabled = false, ...props }: MenuRadioItemProps) {
  const id = useId();
  return (
    <BaseMenu.RadioItem {...itemProps(id, props)} value={value} disabled={disabled} closeOnClick={closeOnSelect}>
      <ItemBody
        id={id}
        {...props}
        leading={<BaseMenu.RadioItemIndicator keepMounted className={`${styles.indicator} ${styles.dot}`} />}
      />
    </BaseMenu.RadioItem>
  );
}

export function MenuGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <BaseMenu.Group className={styles.group}>
      {label && <BaseMenu.GroupLabel className={styles.groupLabel}>{label}</BaseMenu.GroupLabel>}
      {children}
    </BaseMenu.Group>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className={styles.separator} />;
}

type MenuSubProps = Omit<ItemCommon, "shortcut" | "keyshortcuts" | "children"> & {
  label: ReactNode;
  children: ReactNode;
};

export function MenuSub({ label, icon, description, disabled = false, children }: MenuSubProps) {
  const id = useId();
  return (
    <BaseMenu.SubmenuRoot>
      <BaseMenu.SubmenuTrigger {...itemProps(id, { children: label, description })} disabled={disabled}>
        <ItemBody
          id={id}
          icon={icon}
          description={description}
          trailing={<Icon className={styles.chevron} name="chevron-right" />}
        >
          {label}
        </ItemBody>
      </BaseMenu.SubmenuTrigger>
      {/* Lines the submenu's first item up with its trigger. */}
      <MenuPanel side="inline-end" align="start" sideOffset={4} alignOffset={-8}>
        {children}
      </MenuPanel>
    </BaseMenu.SubmenuRoot>
  );
}
