import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  experimental: {
    // Tree-shake icon/chart libraries so only imported symbols end up in the bundle.
    optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-query"],
  },
};

export default nextConfig;
