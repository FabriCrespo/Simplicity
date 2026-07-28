import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pency-images.nyc3.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tap-pencyinfra-prod.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "admin.pency.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pency.app",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/categoria/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/producto/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
