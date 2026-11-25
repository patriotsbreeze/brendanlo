import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every page has its own root layout, so there is no shared one for a 404 and
    // src/app/global-not-found.tsx renders unmatched URLs. See
    // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
    globalNotFound: true,
  },
};

export default nextConfig;
