import type { NextConfig } from "next";

// Short names for /zetamath, each sending its path along: z.brendanlo.dev/stats
// goes to brendanlo.dev/zetamath/stats. The DNS is a wildcard on Vercel's
// nameservers, and each name is also one of the project's domains on Vercel.
const ZETAMATH_HOSTS = ["z", "zm", "zeta", "zetam", "zmath", "zetamath"];
const zetamathHost = [
  { type: "host" as const, value: `(?:${ZETAMATH_HOSTS.join("|")})\\.brendanlo\\.dev` },
];

const nextConfig: NextConfig = {
  async redirects() {
    // Temporary (307), so that a name can be given to something else later
    // without browsers holding on to where it used to go. The bare page has
    // rules of its own: on Vercel an empty `:path*` leaves a trailing slash,
    // which costs a second redirect.
    const to = (source: string, destination: string) => ({
      source,
      has: zetamathHost,
      destination: `https://brendanlo.dev/zetamath${destination}`,
      permanent: false,
    });
    return [
      to("/", ""),
      to("/zetamath", ""),
      to("/zetamath/:path+", "/:path+"),
      to("/:path+", "/:path+"),
    ];
  },
  // The in-process Postgres `next dev` uses for /zetamath. It loads a .wasm file
  // from its own folder, so it cannot be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Two root layouts ((home) and (lab)) leave no shared layout for a 404, so
    // src/app/global-not-found.tsx renders unmatched URLs. See
    // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
    globalNotFound: true,
  },
};

export default nextConfig;
