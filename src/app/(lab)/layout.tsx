import type { Metadata, Viewport } from "next";
import { body, display, mono } from "./fonts";
import "./lab.css";

/* Second root layout. "/" lives under (home) with its own <html>, so nothing
 * here can leak into the home page and vice versa: navigating between the two
 * is a full page load (route-groups.md, "Full page load"). */

const DESCRIPTION =
  "brendan lo's projects as the tensors behind them, pressed into a bed of pins. yellow is what a model said; green is what something deterministic checked.";

export const metadata: Metadata = {
  // Not inherited across root layouts, so it is set again here.
  metadataBase: new URL("https://brendanlo.dev"),
  title: { absolute: "brendan lo, pressed into pins" },
  description: DESCRIPTION,
  alternates: { canonical: "/experimental" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brendanlo.dev/experimental",
    title: "brendan lo, pressed into pins",
    description: DESCRIPTION,
    siteName: "brendan lo",
  },
  twitter: {
    card: "summary",
    title: "brendan lo, pressed into pins",
    description: DESCRIPTION,
    creator: "@patriotsbreeze",
  },
  // Experimental: keep it out of search until it graduates. robots.txt must
  // NOT disallow the path, or crawlers never see this tag.
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#e3e5e0",
  colorScheme: "light",
};

export default function LabRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
