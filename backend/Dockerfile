# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

# Install system dependencies for Prisma and PostgreSQL
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
      libssl3 \
      && rm -rf /var/lib/apt/lists/*

# Install dependencies in a separate layer for better caching
COPY --link package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --production

# Copy the rest of the application code
COPY --link . .

# Remove any .env files if present (defense-in-depth)
RUN rm -f .env prisma/.env || true

# Create a non-root user and switch to it
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Expose the port (default 3000)
EXPOSE 3000

# Entrypoint
CMD ["npm", "start"]
