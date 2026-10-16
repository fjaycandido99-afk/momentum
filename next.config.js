/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'jkrpreixylczfdfdyxrm.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Every page refuses to be framed, except the public landing page,
        // which AppForAll (the studio that built it) shows live in its
        // portfolio. Embedded cross-site, no signed-in session reaches it.
        source: '/:path((?!download$).*)',
        headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
      },
      {
        source: '/download',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://appforall.llc https://www.appforall.llc https://patchpulse.app" }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
// Build trigger: 1769243650
