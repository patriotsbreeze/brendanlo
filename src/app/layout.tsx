import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* The `opsz` axis is the whole argument for this face: with the browser default
 * `font-optical-sizing: auto`, the display cut thins strokes and sharpens serifs
 * at 136px while the text cut thickens them at 17px. That's why the page reads
 * typeset rather than scaled up. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

/* Lead with the papers, same as the hero. Every sentence carries a proper
 * noun or a numeral — "at the intersection of technology and science" said
 * nothing a search result or a PI could act on. */
const DESCRIPTION =
  "Brendan Lo — computational biology and machine learning. Co-author on four 2026 papers: one in the Journal of Cell Biology and three at ICML workshops. Studying CS and Mathematics at the University of Chicago.";

export const metadata: Metadata = {
  title: "Brendan Lo | Computational Biology & Machine Learning",
  description: DESCRIPTION,
  keywords: ["Brendan Lo", "Computational Biology", "Machine Learning", "Topological Data Analysis", "UChicago", "Weill Cornell", "Columbia", "ICML", "Journal of Cell Biology", "Software Engineer"],
  authors: [{ name: "Brendan Lo" }],
  creator: "Brendan Lo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brendanlo.com",
    title: "Brendan Lo | Computational Biology & Machine Learning",
    description: DESCRIPTION,
    siteName: "Brendan Lo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brendan Lo | Computational Biology & Machine Learning",
    description: DESCRIPTION,
    creator: "@patriotsbreeze",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Brendan Lo",
    "url": "https://brendanlo.com",
    "jobTitle": "Computational Biology & Machine Learning Researcher",
    "description": DESCRIPTION,
    "affiliation": { "@type": "CollegeOrUniversity", "name": "University of Chicago" },
    "alumniOf": { "@type": "HighSchool", "name": "Great Neck South High School" },
    "knowsAbout": [
      "Computational Biology",
      "Machine Learning",
      "Topological Data Analysis",
      "RNA-seq Analysis",
      "Molecular Dynamics",
      "Mathematics",
      "Full-stack Development"
    ],
    "sameAs": [
      "https://github.com/patriotsbreeze",
      "https://www.linkedin.com/in/brendan-lo-8b0b80247/"
    ]
  };

  return (
    /* Font variables belong on <html>: the --font-display/--font-ui role tokens
     * are declared on :root, and a custom property resolves its var() references
     * in the scope where it is declared. On <body> they would be out of scope. */
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {/* The canvas is no longer a fixed page-wide layer — it lives inside
          * Fig. 1 in the hero, so it scrolls away and stops rendering. */}
        <header>
          <Navbar />
        </header>
        {/* A display:none keyword footer used to sit here. Hidden text is a
          * ranking risk rather than a benefit, and the real content — papers,
          * venues, DOIs — is all server-rendered and crawlable now. */}
        <main>{children}</main>
      </body>
    </html>
  );
}
