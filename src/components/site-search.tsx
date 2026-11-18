"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import type { Command, CommandPaletteProps } from "@registry/command-palette/command-palette";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";

type Item = { name: string; title: string };

const noSubscribe = () => () => {};

// The palette loads on first use (or when the pointer or focus reaches the
// button), so pages that never search don't carry it.
let palette: Promise<ComponentType<CommandPaletteProps>> | null = null;
function loadPalette(set: (C: ComponentType<CommandPaletteProps>) => void) {
  palette ??= import("@registry/command-palette/command-palette").then((m) => m.CommandPalette);
  palette.then(set, () => {
    palette = null; // Offline for a moment: the next try fetches it again.
  });
}

/** Search, in the top bar of every page: an icon button, and ⌘K (Ctrl+K)
 *  from anywhere. It finds every component. The one ⌘K on the site. */
export function SiteSearch({ components }: { components: Item[] }) {
  const router = useRouter();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [Palette, setPalette] = useState<ComponentType<CommandPaletteProps> | null>(null);
  const [wants, setWants] = useState(false);
  const warm = () => loadPalette((C) => setPalette(() => C));
  const openSearch = () => {
    if (Palette) return setOpen(true);
    setWants(true);
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
      setWants(true);
      loadPalette((C) => setPalette(() => C));
    }
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [Palette]);

  // A search asked for while the palette loaded opens once it has mounted
  // closed, so it opens with its usual transition.
  useEffect(() => {
    if (!Palette || !wants) return;
    const frame = requestAnimationFrame(() => {
      setWants(false);
      setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [Palette, wants]);

  const go = (href: string) => () => router.push(href);
  const commands: Command[] = [
    ...components.map((c) => ({ id: c.name, label: c.title, group: "Components", onSelect: go(`/docs/${c.name}`) })),
  ];

  return (
    <>
      {Palette && (
        <Palette
          open={open}
          onOpenChange={setOpen}
          commands={commands}
          label="Search UI Polish"
          placeholder="Search components…"
          triggerRef={button}
        />
      )}
      <Button ref={button} variant="ghost" size="sm" aria-label="Search components" aria-keyshortcuts="Meta+K Control+K" title={`Search (${mod}K)`} onClick={openSearch} onPointerEnter={warm} onFocus={warm}>
        <Icon name="search" />
      </Button>
    </>
  );
}
