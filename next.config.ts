import type { NextConfig } from "next";
import createMDX from '@next/mdx'

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  output: 'standalone',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // For static export
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/waves/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable'
          }
        ]
      },
      {
        source: '/:path*.(png|webp|jpg|jpeg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable'
          }
        ]
      }
    ]
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
})
 
// Merge MDX config with Next.js config
export default withMDX(nextConfig)
