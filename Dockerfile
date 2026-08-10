# syntax=docker/dockerfile:1
# VCC-Workflow — single-image dev/demo runtime (API + web).
# Debian (glibc) base so the Prisma engine and Claude Agent SDK native binaries load.
FROM node:22-bookworm-slim

# git is needed for worktrees + artifact collection; npx is bundled with Node.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Activate the pinned pnpm from package.json's packageManager field.
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy the repo (node_modules / .env / DBs excluded via .dockerignore).
COPY . .

# Install fresh (Linux binaries), build shared schema, seed a local .env, generate the Prisma client.
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @vcc-workflow/schema build \
  && cp -n apps/api/.env.example apps/api/.env \
  && pnpm --filter @vcc-workflow/api prisma:generate

EXPOSE 3001 5173

# Apply migrations to the (volume-backed) SQLite DB, then run API + web together.
CMD ["sh", "-c", "pnpm --filter @vcc-workflow/api prisma:migrate && pnpm dev"]
