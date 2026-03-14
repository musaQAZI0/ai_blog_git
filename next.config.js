/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize canvas and chartjs-node-canvas for server-side rendering
      // This prevents webpack from trying to bundle native modules
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        'canvas',
        'chartjs-node-canvas',
        {
          'canvas': 'commonjs canvas',
          'chartjs-node-canvas': 'commonjs chartjs-node-canvas'
        },
      ]

      // Ignore dynamic require warnings
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
      ]
    }
    return config
  },
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
    // Use worker_threads instead of spawning child processes for build workers.
    // Helps in environments where process spawning is restricted (EPERM spawn).
    workerThreads: true,
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
