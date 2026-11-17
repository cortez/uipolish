import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { ThemeScript } from "@registry/theme-toggle/theme-script";
import { AUTHOR, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/seo/site";
import "../../foundation/tokens.css";
import "./globals.css";

// The site's type: DM Sans for everything, DM Mono for code. The components
// themselves don't bring fonts; they read --ui-font-*, which globals.css
// points at these.
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [AUTHOR],
  creator: AUTHOR.name,
  publisher: SITE_NAME,
  category: "technology",
  // Canonicals are per page: one here would be inherited by every page.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [OG_IMAGE.url] },
};

// The site follows the OS theme unless the visitor picks one (ThemeScript,
// ThemeToggle); the browser chrome follows the OS (--ui-canvas).
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#070707" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ThemeScript sets data-theme on <html> before paint, which React didn't render.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="UI Polish for language models" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
