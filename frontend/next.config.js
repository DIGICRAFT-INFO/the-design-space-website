/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
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
        hostname: "thedesignspace-website-mix-13july26.onrender.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.hostingersite.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.thedesignspace.in",
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = nextConfig;
