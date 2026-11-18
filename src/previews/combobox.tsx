"use client";

import { useCallback, useRef } from "react";
import { Combobox, type ComboboxOption } from "@registry/combobox/combobox";
import base from "./preview.module.css";

const CLIENTS: ComboboxOption[] = [
  { value: "harbor", label: "Ada Moreno", description: "ada.moreno@example.com" },
  { value: "juniper", label: "Ben Adler", description: "ben.adler@example.org" },
  { value: "linden", label: "Clara Novak", description: "clara.novak@example.com" },
  { value: "marrow", label: "Dana Whitfield", description: "dana.whitfield@example.com" },
  { value: "north", label: "Eli Sato", description: "eli.sato@example.org" },
  { value: "orchard", label: "Frances Oduya", description: "frances.oduya@example.com" },
  { value: "quill", label: "Gus Petrov", description: "gus.petrov@example.org" },
  { value: "saffron", label: "Hana Ito", description: "hana.ito@example.com" },
  { value: "tidewater", label: "Leo Marsh", description: "leo.marsh@example.com" },
  { value: "wren", label: "Nora Quinn", description: "nora.quinn@example.org" },
];

const GUESTS: ComboboxOption[] = [
  { value: "amara", label: "Amara Okafor" },
  { value: "bea", label: "Béatrice Laurent" },
  { value: "chen", label: "Chen Wei" },
  { value: "dmitri", label: "Dmitri Volkov" },
  { value: "elena", label: "Elena García" },
  { value: "farid", label: "Farid Haddad", disabled: true, description: "Already seated beside Maya" },
  { value: "grace", label: "Grace Kim" },
  { value: "hugo", label: "Hugo Lindqvist" },
  { value: "ines", label: "Inês Duarte" },
  { value: "jonah", label: "Jonah Brooks" },
];

export function ComboboxPreview() {
  const clients = useRef(CLIENTS);

  // Stands in for a request to a server: a little latency, a filtered list.
  const loadClients = useCallback(async (query: string, signal: AbortSignal) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 200 + Math.random() * 500);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
    const q = query.trim().toLowerCase();
    return clients.current.filter((c) => !q || c.label.toLowerCase().includes(q));
  }, []);

  return (
    <div className={base.stack}>
      <form className={base.form} noValidate onSubmit={(e) => e.preventDefault()}>
        <h2 className={base.heading}>New invitation</h2>
        <Combobox
          label="Invite"
          name="client"
          placeholder="Search contacts"
          loadOptions={loadClients}
          onCreate={(text) => {
            const option = { value: `new-${clients.current.length}`, label: text, description: "New contact" };
            clients.current = [...clients.current, option];
            return option;
          }}
          createLabel={(text) => `Add contact “${text}”`}
          hint="The invitation goes to their email address."
          validate={(v) => (v ? null : "Choose a guest, or add them as a contact")}
        />
      </form>
      <section className={base.form}>
        <Combobox
          label="Seat next to"
          options={GUESTS}
          defaultValue="elena"
          emptyMessage={(text) => `No guest named “${text}”`}
          hint="Maya confirms seating on Friday."
        />
      </section>
    </div>
  );
}
