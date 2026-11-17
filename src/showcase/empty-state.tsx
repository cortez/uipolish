"use client";

import { Button } from "@registry/button/button";
import { EmptyState } from "@registry/empty-state/empty-state";
import { Icon } from "@registry/icons/icons";

export default function Showcase() {
  return (
    <EmptyState
      icon="calendar"
      title="No dinners on the calendar"
      action={
        <Button>
          <Icon name="plus" />
          Plan a dinner
        </Button>
      }
    />
  );
}
