/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://*.google-analytics.com; " +
              "style-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.gstatic.com; " +
              "img-src 'self' data: https: blob:; " +
              "font-src 'self' data:; " +
              "connect-src 'self' " +
                "https://*.firebase.com " +
                "https://*.firebaseio.com " +
                "https://*.googleapis.com " +
                "https://identitytoolkit.googleapis.com " +
                "https://securetoken.googleapis.com " +
                "https://firebasestorage.googleapis.com " +
                "https://firestore.googleapis.com " +
                "https://www.googleapis.com " +
                "wss://*.firebaseio.com " +
                "https://*.google-analytics.com; " +
              "frame-ancestors 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self';",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
