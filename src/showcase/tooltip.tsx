"use client";

import { Button } from "@registry/button/button";
import { Tooltip } from "@registry/tooltip/tooltip";

export default function Showcase() {
  return (
    <Tooltip content="Emails the invitation and an RSVP link to 12 guests." arrow>
      <Button>Send invitations</Button>
    </Tooltip>
  );
}
