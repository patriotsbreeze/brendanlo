import { Big_Shoulders, Fragment_Mono, Host_Grotesk } from "next/font/google";

/* Fonts load only on routes under (lab)/layout.tsx; the home root stays
 * font-free. One definition per family (font.md, "Using a font definitions
 * file"); loader calls must be module-scope consts with literal options.
 *
 * Big Shoulders: drawn for City of Chicago signage, so the name is set in
 * the city's own lettering. opsz is requested so large sizes pick up the
 * display cut. Host Grotesk: body text. Fragment Mono: live values only. */

export const display = Big_Shoulders({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
  // next/font has no metric overrides for this family (build warning), so
  // name a narrow system fallback instead of an auto-adjusted one.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "Roboto Condensed", "sans-serif"],
});

export const body = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const mono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});
