"use client";

import { EmptyState } from "@registry/empty-state/empty-state";
import { Button } from "@registry/button/button";
import { Icon } from "@registry/icons/icons";
import styles from "./empty-state.module.css";
import base from "./preview.module.css";

export function EmptyStatePreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.label}>Page</h2>
        <EmptyState
          size="page"
          icon="calendar"
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
            icon="link"
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
            icon="search"
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
