"use client";

import { useRef, useState } from "react";
import { CommandPalette, type Command } from "@registry/command-palette/command-palette";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";

export default function Showcase() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const noop = () => {};
  const commands: Command[] = [
    { id: "new", label: "New dinner", group: "Dinners", icon: <Icon name="plus" />, shortcut: ["⌘", "N"], onSelect: noop },
    { id: "open", label: "Open Saturday supper", group: "Dinners", icon: <Icon name="file" />, hint: "14 Alder Lane", onSelect: noop },
    { id: "send", label: "Send invitations", group: "Dinners", icon: <Icon name="send" />, keywords: ["email", "invite"], onSelect: noop },
    { id: "menu", label: "Edit the menu", group: "Dinners", icon: <Icon name="pencil" />, onSelect: noop },
    { id: "settings", label: "Open settings", group: "Settings", icon: <Icon name="settings" />, onSelect: noop },
  ];
  return (
    <>
      <Button ref={triggerRef} variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="search" />
        Search commands
      </Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commands}
        hotkey={false}
        triggerRef={triggerRef}
        placeholder="Search dinners and commands…"
      />
    </>
  );
}
