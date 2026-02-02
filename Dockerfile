# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for sharp and other native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Run env check during image build
# NOTE: This will fail the Docker build unless required env vars are available at build time.
ENV SKIP_ENV_CHECK=0

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for sharp
RUN apk add --no-cache vips

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/scripts/verify-env.js ./scripts/verify-env.js

# Create cache directory with proper permissions
RUN mkdir -p .next/cache/images && chown -R nextjs:nodejs .next

# Set ownership
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node scripts/verify-env.js && node server.js"]
