import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The generated client lives outside node_modules; include its native engine
  // explicitly so Vercel functions can open the database after bundling.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/*.so.node"],
  },
};

export default nextConfig;
