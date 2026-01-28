FROM node:20-alpine

WORKDIR /app

# Native deps for sharp / next
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Runtime envs injected by Render; build at runtime so NEXT_PUBLIC_* are available
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Render sets PORT (often 10000). Default to 3000 for local docker run.
CMD ["sh", "-c", "export PORT=${PORT:-3000}; npm run build && npm start"]
