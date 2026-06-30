# Capture worker image. Built on the official Playwright image so Chromium + its
# OS dependencies are present (Lighthouse uses the same Chromium). The base
# version MUST match the `playwright` npm version in apps/worker/package.json.
FROM mcr.microsoft.com/playwright:v1.49.1-noble
RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @vigil/db generate

ENV NODE_ENV=production
# Give the Lighthouse Node process headroom on heavy pages.
ENV NODE_OPTIONS=--max-old-space-size=4096
CMD ["pnpm", "--filter", "@vigil/worker", "start"]
