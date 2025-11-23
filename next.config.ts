import type { NextConfig } from "next";

// Build the list of remote image patterns once so we avoid the TS union
// issue that arises from conditional spread syntax inside the config
const remoteImagePatterns: {
  protocol: "https";
  hostname: string;
  pathname: "/*" | "/**";
}[] = [
  {
    protocol: "https" as const,
    hostname: "**.deepfi.sh",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "deepfi.sh",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "fal.media",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "replicate.delivery",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "**.replicate.delivery",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "**.vercel-storage.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "**.fal.media",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "img.clerk.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "storage.googleapis.com",
    pathname: "/**",
  },
];

if (process.env.NEXT_PUBLIC_BLOB_URL) {
  try {
    const blobHost = new URL(process.env.NEXT_PUBLIC_BLOB_URL).hostname;
    remoteImagePatterns.push({
      protocol: "https",
      hostname: blobHost,
      pathname: "/**",
    } as const);
  } catch {}
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["three"],
  // devIndicators: false,
  /**
   * Allow the Next.js <Image /> component to load images hosted on
   * external domains (Replicate CDN, Vercel blob storage and the
   * optional NEXT_PUBLIC_BLOB_URL).  Without this whitelist any page
   * that tries to render such a URL will throw:
   *   "Invalid src prop on next/image, hostname is not configured…"
   */
  images: {
    remotePatterns: remoteImagePatterns,
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? true : false,
  },
  experimental: {
    // ppr: "incremental",
  },
  // Headers for better caching
  // async headers() {
  // return [
  //   {
  //     source: "/:path*",
  //     headers: [
  //       {
  //         key: "X-DNS-Prefetch-Control",
  //         value: "on",
  //       },
  //     ],
  //   },
  // {
  //   source: "/fonts/:path*",
  //   headers: [
  //     {
  //       key: "Cache-Control",
  //       value: "public, max-age=31536000, immutable",
  //     },
  //   ],
  // },
  // {
  //   source: "/_next/static/:path*",
  //   headers: [
  //     {
  //       key: "Cache-Control",
  //       value: "public, max-age=31536000, immutable",
  //     },
  //   ],
  // },
  // ];
  // },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
};

export default nextConfig;
