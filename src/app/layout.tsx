import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Brendan Lo | Software Engineer & Researcher",
  description: "Portfolio of Brendan Lo, a Software Engineer and Researcher at UChicago and Weill Cornell. Specialized in AI, full-stack development, and bioengineering.",
  keywords: ["Brendan Lo", "Software Engineer", "Researcher", "UChicago", "Weill Cornell", "AI", "Machine Learning", "Bioengineering", "Next.js", "React", "TypeScript"],
  authors: [{ name: "Brendan Lo" }],
  creator: "Brendan Lo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brendanlo.com",
    title: "Brendan Lo | Software Engineer & Researcher",
    description: "Software Engineer and Researcher focusing on the intersection of technology and science.",
    siteName: "Brendan Lo Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brendan Lo | Software Engineer & Researcher",
    description: "Software Engineer and Researcher focusing on the intersection of technology and science.",
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
    "jobTitle": "Software Engineer & Researcher",
    "alumniOf": "University of Chicago",
    "knowsAbout": ["Computer Science", "Bioengineering", "AI", "Machine Learning", "Full-stack Development"],
    "sameAs": [
      "https://github.com/patriotsbreeze",
      "https://www.linkedin.com/in/brendan-lo-8b0b80247/"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header>
          <Navbar />
        </header>
        <main>{children}</main>
        <footer className="hidden-seo-content" style={{ display: 'none' }}>
          <p>Brendan Lo Portfolio - Software Engineering and Biological Research.</p>
        </footer>
      </body>
    </html>
  );
}
