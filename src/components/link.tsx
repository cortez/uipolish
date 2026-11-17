"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";

/**
 * The site's link: Next's Link without prefetching every link that scrolls
 * into view (the docs nav alone has ~80, so a page view cost ~100 requests).
 * It prefetches when a visit is likely instead: on hover, keyboard focus or
 * touch, which still lands well before the click.
 */
export default function Link({ onMouseEnter, onFocus, onTouchStart, prefetch, ...props }: ComponentProps<typeof NextLink>) {
  const router = useRouter();
  const href = typeof props.href === "string" ? props.href : props.href.pathname ?? "";
  const warm = () => {
    if (href.startsWith("/")) router.prefetch(href);
  };
  return (
    <NextLink
      {...props}
      prefetch={prefetch ?? false}
      onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        warm();
        onFocus?.(e);
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        warm();
        onTouchStart?.(e);
      }}
    />
  );
}
