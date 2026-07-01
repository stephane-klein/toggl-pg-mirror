FROM node:24-slim AS build

RUN npm install -g pnpm@11.2.2

WORKDIR /app/

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11.2.2

WORKDIR /app/

ENV PATH="/app/node_modules/.bin:${PATH}"
ENV NODE_ENV=production
ENV TOGGL_PG_MIRROR_POSTGRES_URL=postgres://postgres:postgres@postgres:5432/postgres

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/build/ ./build/
COPY src/lib/backend/ ./src/lib/backend/
COPY src/cli.js src/migrate.js src/seed.js ./src/
COPY sqls/ ./sqls/
COPY entrypoint.sh /entrypoint.sh

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/ready || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve"]
