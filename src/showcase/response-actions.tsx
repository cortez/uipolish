"use client";

import { useState } from "react";
import { ResponseActions, type Rating } from "@registry/response-actions/response-actions";

export default function Showcase() {
  const [rating, setRating] = useState<Rating>(null);
  return (
    <ResponseActions
      text="Serve the lamb at 8, with dessert on the patio at 9:30."
      rating={rating}
      onRate={setRating}
      onComment={() => {}}
      onRetry={() => setRating(null)}
    />
  );
}
