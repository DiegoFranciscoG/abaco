# syntax=docker/dockerfile:1

# ---- 1) Build: exact dependencies from the lockfile, generated indexes and the static site.
FROM node:24.22.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: no dependency may run install scripts inside the build.
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts csp.config.ts ./
COPY scripts ./scripts
COPY content ./content
COPY public ./public
COPY src ./src
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

# ---- 2) Serve: unprivileged nginx (UID 101), only the compiled files.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine-slim
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
