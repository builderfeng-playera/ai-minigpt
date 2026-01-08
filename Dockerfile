# Use Node.js LTS version
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Create public directory (Next.js standalone mode may not have public folder)
RUN mkdir -p ./public
# Copy public directory if it exists (using shell to handle missing/empty directory)
RUN --mount=from=builder,source=/app,target=/tmp/src \
    if [ -d /tmp/src/public ] && [ "$(ls -A /tmp/src/public 2>/dev/null)" ]; then \
        cp -r /tmp/src/public/. ./public/ 2>/dev/null || true; \
    fi || true
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Expose port (PORT will be set at runtime by Koyeb)
EXPOSE 3000

ENV HOSTNAME "0.0.0.0"

# Start the application using PORT environment variable
# Use shell form (sh -c) to ensure environment variable expansion
# Next.js standalone server reads PORT from process.env automatically
CMD sh -c "PORT=${PORT:-3000} node server.js"

