# syntax=docker/dockerfile:1.7

# ─── Stage 1 — install deps (cached separately from source code) ──────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# BuildKit cache mount keeps the npm cache across builds even though the
# install layer itself is reproducible. Falls back gracefully if BuildKit
# isn't enabled on the host (e.g. older docker-compose without DOCKER_BUILDKIT=1).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# ─── Stage 2 — runtime (slim, non-root, dumb-init for proper signal handling) ──
FROM node:20-alpine AS runtime
WORKDIR /app

# dumb-init forwards SIGTERM/SIGINT to Node so `docker stop` doesn't hang 10s.
# wget is used by HEALTHCHECK.
RUN apk add --no-cache dumb-init wget && \
    addgroup -S app && adduser -S app -G app

# Copy installed deps from the deps stage, then the source.
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .

# Uploads land here at runtime (khata proof images / voice notes when Cloudinary
# isn't configured). docker-compose mounts a named volume on top of this so the
# files survive container rebuilds.
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads

ENV NODE_ENV=production \
    PORT=5000

USER app
EXPOSE 5000

# Container is healthy when the API /health endpoint returns 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://localhost:5000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
