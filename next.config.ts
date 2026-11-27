import type { NextConfig } from "next";
import { PAGES, SHORT_HOST } from "./src/app/(zetamath)/zetamath/_lib/hosts";

// zetamath at its short names, z.brendanlo.dev and the rest: see _lib/hosts.ts.
const onShortName = [{ type: "host" as const, value: SHORT_HOST }];
const page = `:page(${PAGES.join("|")})`;

const nextConfig: NextConfig = {
  // So that z.localhost:3000 can load the dev server's scripts.
  allowedDevOrigins: ["*.localhost"],
  async redirects() {
    // A zetamath page reached on a short name by its long address: the short
    // one, so there is one address for each page there. Temporary (307), so
    // that a name can be given to something else later without browsers
    // holding on to it.
    return [
      { source: "/zetamath", has: onShortName, destination: "/", permanent: false },
      { source: `/zetamath/${page}`, has: onShortName, destination: "/:page", permanent: false },
    ];
  },
  async rewrites() {
    // Before the files, or "/" would be the home page. Everything else on a
    // short name, the API under /zetamath/api and /_next among it, is as it is.
    // A rule whose destination uses none of what it matched passes all of it on
    // as query, so the play page is rendered with ?host=z.brendanlo.dev: it
    // reads no query, and if it ever does, "host" is taken.
    return {
      beforeFiles: [
        { source: "/", has: onShortName, destination: "/zetamath" },
        { source: `/${page}`, has: onShortName, destination: "/zetamath/:page" },
      ],
      afterFiles: [],
      fallback: [],
    };
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
