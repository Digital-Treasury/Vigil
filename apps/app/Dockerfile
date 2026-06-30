# Next.js app image (single Node service). Built for the deploy-later path;
# local development runs on the host with `pnpm dev`.
FROM node:22-slim AS base
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @vigil/db generate
RUN pnpm --filter @vigil/app build

ENV NODE_ENV=production
EXPOSE 3000
# Apply migrations, then start. (Migrations are idempotent — safe with one app replica.)
CMD ["sh", "-c", "pnpm --filter @vigil/db migrate:deploy && pnpm --filter @vigil/app start"]
