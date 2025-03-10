import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/socket.io',
        destination: `${process.env.NEXT_PUBLIC_SOCKET_URL}/socket.io`,
      },
    ];
  },
  images: {
    domains: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  },
};

export default nextConfig;
