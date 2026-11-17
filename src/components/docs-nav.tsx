"use client";

import Link from "@/components/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Command, CommandPaletteProps } from "@registry/command-palette/command-palette";
import { Icon } from "@registry/icons/icons";
import { ScrollArea } from "@registry/scroll-area/scroll-area";
import { PRIMITIVES, START } from "./component-index";
import styles from "./docs-nav.module.css";

type Item = { name: string; title: string; kit?: "agent"; type?: "block" | "template" };

const noSubscribe = () => () => {};

// The search palette is most of the nav's code and few visits open it, so it
// loads on first use (or when the pointer or focus reaches the search button).
let palette: Promise<ComponentType<CommandPaletteProps>> | null = null;
function loadPalette(set: (C: ComponentType<CommandPaletteProps>) => void) {
  palette ??= import("@registry/command-palette/command-palette").then((m) => m.CommandPalette);
  palette.then(set, () => {
    palette = null; // Offline for a moment: the next try fetches it again.
  });
}

/** Docs navigation: the sidebar's list, beside the page on wide screens and
 *  under it on narrow ones (DocsShell slides the page aside).
 *  ⌘K (Ctrl+K) searches every page from anywhere in the docs. */
export function DocsNav({ components }: { components: Item[] }) {
  const path = usePathname();
  const router = useRouter();
  const list = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const [searching, setSearching] = useState(false);
  const [Palette, setPalette] = useState<ComponentType<CommandPaletteProps> | null>(null);
  const [wantsSearch, setWantsSearch] = useState(false);
  const warm = () => loadPalette((C) => setPalette(() => C));
  const openSearch = () => {
    if (Palette) return setSearching(true);
    setWantsSearch(true);
    warm();
  };
  // The shortcut as this platform writes it; the Mac form on the server.
  const mod = useSyncExternalStore(
    noSubscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl "),
    () => "⌘",
  );

  // Until the palette has loaded, ⌘K is ours; once it has, the palette
  // handles the shortcut itself.
  useEffect(() => {
    if (Palette) return;
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setWantsSearch(true);
      loadPalette((C) => setPalette(() => C));
    }
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [Palette]);

  // A search asked for while the palette loaded opens once it has mounted
  // closed, so it opens with its usual transition.
  useEffect(() => {
    if (!Palette || !wantsSearch) return;
    const frame = requestAnimationFrame(() => {
      setWantsSearch(false);
      setSearching(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [Palette, wantsSearch]);

  // Keep the current page in sight: arriving on a page low in the list (from
  // a link or a reload) scrolls only the sidebar, only as far as needed, and
  // only when it's out of view. Scroll padding keeps it clear of the fades.
  useEffect(() => {
    // The ScrollArea's viewport: the list's nearest ancestor that scrolls.
    let scroller = list.current?.parentElement;
    while (scroller && getComputedStyle(scroller).overflowY === "visible") scroller = scroller.parentElement;
    const current = list.current?.querySelector('[aria-current="page"]');
    if (!scroller || !current) return;
    const pad = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
    const row = current.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    if (row.top < box.top + pad) scroller.scrollTop -= box.top + pad - row.top;
    else if (row.bottom > box.bottom - pad) scroller.scrollTop += row.bottom - (box.bottom - pad);
  }, [path]);
  // Templates and blocks first: whole apps and screens, the fastest way to
  // something shipped. Then the components for AI products, then the rest.
  const groups = [
    { label: "Templates", items: components.filter((c) => c.type === "template") },
    { label: "Blocks", items: components.filter((c) => c.type === "block") },
    { label: "Agent kit", items: components.filter((c) => !c.type && c.kit === "agent") },
    { label: "Components", items: components.filter((c) => !c.type && c.kit !== "agent" && !PRIMITIVES.includes(c.name)) },
    { label: "Primitives", items: components.filter((c) => PRIMITIVES.includes(c.name)) },
  ].filter((g) => g.items.length > 0);
  const go = (href: string) => () => router.push(href);
  const commands: Command[] = [
    ...START.map((s) => ({ id: s.href, label: s.title, group: "Get started", onSelect: go(s.href) })),
    ...groups.flatMap((g) =>
      g.items.map((c) => ({ id: c.name, label: c.title, group: g.label, onSelect: go(`/docs/${c.name}`) })),
    ),
  ];

  return (
    <nav className={styles.nav} aria-label="Docs">

      {Palette && (
        <Palette
          open={searching}
          onOpenChange={setSearching}
          commands={commands}
          label="Search the docs"
          placeholder="Search the docs…"
          triggerRef={searchRef}
        />
      )}

      <ScrollArea className={styles.scroll} aria-label="Docs pages">
        <div ref={list} className={styles.list}>
          <button
            ref={searchRef}
            type="button"
            className={styles.search}
            onClick={openSearch}
            onPointerEnter={warm}
            onFocus={warm}
          >
            <Icon name="search" />
            <span className={styles.searchLabel}>Search</span>
            <kbd className={styles.kbd}>{mod}K</kbd>
          </button>
          <Group label="Get started">
            {START.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={styles.link}
                aria-current={path === s.href ? "page" : undefined}
              >
                {s.title}
              </Link>
            ))}
          </Group>
          {groups.map((g) => (
            <Group key={g.label} label={g.label}>
              {g.items.map((c) => (
                <Link
                  key={c.name}
                  href={`/docs/${c.name}`}
                  className={styles.link}
                  aria-current={path === `/docs/${c.name}` ? "page" : undefined}
                >
                  {c.title}
                </Link>
              ))}
            </Group>
          ))}
        </div>
      </ScrollArea>
    </nav>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.group}>
      <p className={styles.label}>{label}</p>
      {children}
    </div>
  );
}
