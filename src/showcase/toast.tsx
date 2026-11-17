"use client";

import { Button } from "@registry/button/button";
import { Toaster, toast } from "@registry/toast/toast";

export default function Showcase() {
  return (
    <>
      <Button
        variant="secondary"
        onClick={() =>
          toast("Guest removed", {
            description: "Tom Becker",
            action: { label: "Undo", onClick: () => toast.success("Tom is back on the list") },
          })
        }
      >
        Remove guest
      </Button>
      <Toaster />
    </>
  );
}
