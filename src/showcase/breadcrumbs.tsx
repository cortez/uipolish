"use client";

import { Breadcrumbs } from "@registry/breadcrumbs/breadcrumbs";

export default function Showcase() {
  return (
    <Breadcrumbs
      items={[
        { label: "Maya’s suppers", href: "#suppers" },
        { label: "Saturday supper", href: "#saturday-supper" },
        { label: "Menu" },
      ]}
    />
  );
}
