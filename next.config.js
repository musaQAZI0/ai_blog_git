/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Performance Optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Externalize canvas and chartjs-node-canvas for server-side rendering
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        'canvas',
        'chartjs-node-canvas',
        'chart.js',
        {
          'canvas': 'commonjs canvas',
          'chartjs-node-canvas': 'commonjs chartjs-node-canvas',
          'chart.js': 'commonjs chart.js'
        },
      ]

      // Ignore dynamic require warnings
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
      ]
    }

    // Production optimizations - only for client-side
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            // Chart libraries (heavy)
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|chartjs-node-canvas|canvas)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 30
            },
            // Firebase (heavy)
            firebase: {
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 30
            },
          },
        },
      }
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats first
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
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

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    workerThreads: true,
    optimizePackageImports: ['lucide-react', 'date-fns'], // Tree-shake heavy packages
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          // CSP
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
      // Static assets caching
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API routes caching
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
