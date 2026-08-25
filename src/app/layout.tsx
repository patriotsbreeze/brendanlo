import type { Metadata } from "next";
import "./globals.css";

/* No next/font: the page uses the system UI stack, so there is nothing to
 * download and no font-loading class to thread onto <html>. */

const DESCRIPTION =
  "brendan lo — 18, cs + math at uchicago. ai/ml (sometimes bio) research, hackathons, and building things.";

export const metadata: Metadata = {
  metadataBase: new URL("https://brendanlo.com"),
  title: "hi, i'm brendan lo",
  description: DESCRIPTION,
  authors: [{ name: "Brendan Lo" }],
  creator: "Brendan Lo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brendanlo.com",
    title: "hi, i'm brendan lo",
    description: DESCRIPTION,
    siteName: "brendan lo",
  },
  twitter: {
    card: "summary",
    title: "hi, i'm brendan lo",
    description: DESCRIPTION,
    creator: "@patriotsbreeze",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Brendan Lo",
    url: "https://brendanlo.com",
    description: DESCRIPTION,
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: "University of Chicago",
    },
    knowsAbout: [
      "Machine Learning",
      "Computational Biology",
      "Topological Data Analysis",
      "Full-stack Development",
    ],
    sameAs: [
      "https://github.com/patriotsbreeze",
      "https://www.linkedin.com/in/brendan-lo-8b0b80247/",
      "https://beliapp.co/app/brendanlo",
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
