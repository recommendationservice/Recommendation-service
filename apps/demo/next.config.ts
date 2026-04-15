import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["recommendation-service", "@sp/reco-sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
