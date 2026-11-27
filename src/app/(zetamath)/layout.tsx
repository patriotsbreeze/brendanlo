import type { Metadata, Viewport } from "next";
import "./zetamath.css";

/* Its own root layout, like the other pages here: "/" keeps its stylesheet and
 * metadata to itself, and so does this. System fonts only. */

const DESCRIPTION =
  "two minutes of arithmetic, as fast as you can. plus graphs of your runs, and tricks for getting faster.";

export const metadata: Metadata = {
  // Not inherited across root layouts, so it is set again here.
  metadataBase: new URL("https://brendanlo.dev"),
  title: { default: "zetamath", template: "%s | zetamath" },
  description: DESCRIPTION,
  // No title, description or url here: the tabs inherit this object, and each
  // one fills the gaps from its own.
  openGraph: { type: "website", locale: "en_US", siteName: "brendan lo" },
  twitter: { card: "summary", creator: "@patriotsbreeze" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function ZetamathRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
