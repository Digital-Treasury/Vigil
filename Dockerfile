# Build stage — plain Node, no browser needed to compile.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime — Playwright's image ships Chromium + all system deps.
# Keep this tag's version in lockstep with the "playwright" version in package.json.
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    VIGIL_DATA_DIR=/data

WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

RUN mkdir -p /data && chown pwuser:pwuser /data
VOLUME /data
USER pwuser
EXPOSE 3000
CMD ["node", "server.js"]
