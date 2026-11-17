import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ui/theme-toggle/theme-script";
import { Toaster } from "@/components/ui/toast/toast";
import { PRODUCT_NAME } from "@/lib/coding/config";
import "./globals.css";
import styles from "./layout.module.css";

/* globals.css imports the kit's tokens (the shadcn CLI adds that line; by
   hand, add @import "../components/ui/uipolish/tokens.css"). ThemeScript
   puts the stored theme on <html> before the first paint. */

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={styles.body}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
