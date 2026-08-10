/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",               // required for Docker multi-stage build
  experimental: {
    serverComponentsExternalPackages: [],
  },
  async rewrites() {
    // In development, proxy /api/* → backend to avoid CORS
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/:path*",
            destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
