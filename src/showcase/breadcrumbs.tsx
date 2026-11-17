"use client";

import { Breadcrumbs } from "@registry/breadcrumbs/breadcrumbs";

export default function Showcase() {
  return (
    <Breadcrumbs
      items={[
        { label: "Maya’s suppers", href: "#suppers" },
        { label: "2026", href: "#2026" },
        { label: "Autumn", href: "#autumn" },
        { label: "Saturday supper", href: "#saturday-supper" },
        { label: "Menu" },
      ]}
    />
  );
}
