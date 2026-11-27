/* The short names zetamath answers to besides brendanlo.dev/zetamath. Each
 * shows it at its own address, with no redirect: z.brendanlo.dev is the play
 * tab and z.brendanlo.dev/stats the stats tab. next.config.ts rewrites them to
 * the pages under /zetamath, and links say the short address there.
 *
 * Each name is one of the project's domains on Vercel, and the DNS is a
 * wildcard on Vercel's nameservers. A login is kept per address, like the runs
 * a browser has not saved yet: the cookie belongs to the name it was set on. */

export const SHORT_NAMES = ["z", "zm", "zeta", "zetam", "zmath", "zetamath"] as const;

/** A host one of them is on, as a regex. Also under localhost, so that
 * z.localhost:3000 tries it out with `next dev`. */
export const SHORT_HOST = `(?:${SHORT_NAMES.join("|")})\\.(?:brendanlo\\.dev|localhost)`;

const SHORT = new RegExp(`^${SHORT_HOST}$`);

export const isShortHost = (hostname: string) => SHORT.test(hostname.toLowerCase());

/** The pages other than play, which is the short name itself. */
export const PAGES = ["graphs", "stats", "tricks", "account", "privacy"] as const;

/** A link to a zetamath page as it is written on a short name:
 * "/zetamath/stats?span=day" is "/stats?span=day", and "/zetamath" is "/". */
export function shorten(href: string): string {
  if (href === "/zetamath" || href.startsWith("/zetamath?") || href.startsWith("/zetamath#")) {
    return `/${href.slice("/zetamath".length)}`;
  }
  if (href.startsWith("/zetamath/")) return href.slice("/zetamath".length);
  return href;
}

/** A zetamath page's path whichever way it was reached: "/stats" on a short
 * name is "/zetamath/stats". */
export function canonical(path: string): string {
  if (path === "/zetamath" || path.startsWith("/zetamath/")) return path;
  return path === "/" ? "/zetamath" : `/zetamath${path}`;
}
