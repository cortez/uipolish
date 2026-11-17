import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeScript } from "@registry/theme-toggle/theme-script";
import { AUTHOR, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/seo/site";
import "../../foundation/tokens.css";
import "./globals.css";

// The site's type: General Sans for everything, Geist Mono for code: light
// and geometric like General Sans, so code sits in a sentence without
// shouting. The components themselves don't bring fonts; they read
// --ui-font-*, which globals.css points at these. General Sans isn't on Google Fonts, so it's
// self-hosted: the variable files from Fontshare, 200 to 700.
const sans = localFont({
  src: [
    { path: "./fonts/GeneralSans-Variable.woff2", weight: "200 700", style: "normal" },
    { path: "./fonts/GeneralSans-VariableItalic.woff2", weight: "200 700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

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
