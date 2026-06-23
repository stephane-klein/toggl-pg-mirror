FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11.2.2

WORKDIR /app/

ENV PATH="/app/node_modules/.bin:${PATH}"

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY src/ ./src/
COPY sqls/ ./sqls/
COPY entrypoint.sh /entrypoint.sh

ENV TOGGL_PG_MIRROR_POSTGRES_URL=postgres://postgres:postgres@postgres:5432/postgres
ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${TOGGL_PG_MIRROR_HEALTH_PORT:-8080}/ready || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["start-api-sync"]