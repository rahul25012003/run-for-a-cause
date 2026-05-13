import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "cdn.runforacause.in" },
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "https", hostname: "run-for-a-cause-backend.onrender.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/:path*`,
      },
    ];
  },
};

export default config;
