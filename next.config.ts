import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static export
  images: {
    unoptimized: true, // Fix image loading issues in static export
    domains: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  },
};

export default nextConfig;
