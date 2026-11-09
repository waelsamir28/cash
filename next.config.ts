import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel لا يحتاج standalone - نفعله فقط للتطوير المحلي/Docker
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
