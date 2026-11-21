"use client";

import { SplitPane, SplitView } from "@registry/split-view/split-view";
import own from "./split-view.module.css";

const GUESTS = ["Amara Okafor", "Theo Lindqvist", "Priya Raman", "Ben Hughes"];

/** A guest list beside its note: drag the line, or past the list's minimum to fold it away. */
export default function Showcase() {
  return (
    <div className={own.window}>
      <SplitView narrow="split">
        <SplitPane id="guests" label="Guests" defaultSize="44%" minSize={96} collapsible>
          <ul className={own.list}>
            {GUESTS.map((g, i) => (
              <li key={g} className={own.item} data-current={i === 0 || undefined}>
                {g}
              </li>
            ))}
          </ul>
        </SplitPane>
        <SplitPane id="note" label="Note" minSize={112}>
          <div className={own.note}>
            <p className={own.title}>Amara Okafor</p>
            <p className={own.text}>Allergic to nuts. Bringing a plus-one and the olive oil cake.</p>
          </div>
        </SplitPane>
      </SplitView>
    </div>
  );
}
