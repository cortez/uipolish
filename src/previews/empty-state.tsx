"use client";

import { EMPTY_STATE_ART, EmptyState } from "@registry/empty-state/empty-state";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import styles from "./empty-state.module.css";
import base from "./preview.module.css";

const ART_TITLES = {
  stack: "stack: a list or table",
  box: "box: nothing added yet",
  folder: "folder: files and imports",
  tray: "tray: replies and messages",
  search: "search: no results",
  calendar: "calendar: nothing scheduled",
  unplugged: "unplugged: it didn’t load",
} as const;

export function EmptyStatePreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Page</h2>
        <EmptyState
          size="page"
          art="calendar"
          title="No dinners on the calendar"
          description="Pick a night and a host. Guests RSVP from the invitation link."
          action={
            <Button>
              <Icon name="plus" />
              Plan a dinner
            </Button>
          }
        />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Two ways to fill it</h2>
        <EmptyState
          size="page"
          art="folder"
          title="No guests yet"
          description="Import last year’s list, or add people one at a time."
          action={
            <Button>
              <Icon name="upload" />
              Import a file
            </Button>
          }
          secondaryAction={<Button variant="secondary">Add by hand</Button>}
        />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>The drawings</h2>
        <div className={styles.drawings}>
          {EMPTY_STATE_ART.map((art) => (
            <EmptyState key={art} art={art} title={ART_TITLES[art]} titleAs="p" className={styles.drawing} />
          ))}
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Two actions in a narrow panel stack</h2>
        <div className={`${styles.panel} ${styles.narrow}`}>
          <p className={styles.panelTitle}>Menu</p>
          <EmptyState
            title="No courses yet"
            description="Start from a past dinner or write the menu here."
            action={
              <Button variant="secondary">
                Copy a past menu
              </Button>
            }
            secondaryAction={
              <Button variant="ghost">
                Write one
              </Button>
            }
          />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Compact, inside a panel</h2>
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Guests</p>
          <EmptyState
            art="tray"
            title="No RSVPs yet"
            description="Replies to example.com/d/friday-supper show up here as they come in."
            action={
              <Button variant="secondary">
                <Icon name="link" />
                Copy invitation link
              </Button>
            }
          />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>No results</h2>
        <div className={styles.panel}>
          <EmptyState
            art="search"
            title="No books match “Piranesi”"
            description="Try the author’s name, or check the spelling."
            action={
              <Button variant="ghost">
                Clear search
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
}
