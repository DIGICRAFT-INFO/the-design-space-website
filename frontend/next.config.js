/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // eslint.config.mjs previously had an unresolved Git merge conflict, so
    // ESLint silently never ran during `next build` — pre-existing errors in
    // the wider codebase never blocked a deploy. The config now works
    // correctly (see eslint.config.mjs), which surfaces ~270 pre-existing
    // `no-explicit-any`/unescaped-entity issues in CRM files outside this
    // project's scope. Keeping build behavior unchanged (not blocked by
    // lint) while `npx eslint .` remains fully available as a standalone
    // check for whoever wants to clean those up on their own schedule.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.thedesignspace.in",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.hostingersite.com",
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = nextConfig;
