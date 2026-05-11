# syntax=docker/dockerfile:1.7

# ─── Stage 1 — build the Vite SPA ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps first so source changes don't bust the npm cache layer.
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Build args let CI pass a different API origin per env (staging vs prod).
# Empty default = same-origin (nginx reverse-proxies /api to backend in prod).
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ─── Stage 2 — serve the built assets with nginx ──────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Drop the default nginx config so ours is the only one in conf.d.
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/app.conf

EXPOSE 80

# Nginx alpine image already runs as nginx user inside, signals work natively.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
