FROM node:24-slim

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

ENTRYPOINT ["/entrypoint.sh"]
CMD ["start-api-sync"]