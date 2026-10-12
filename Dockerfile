FROM node:20-alpine AS base
WORKDIR /app
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

# ---------- Dépendances (dev incluses, pour le build) ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --prefer-offline

# ---------- Dépendances de production uniquement ----------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund --prefer-offline

# ---------- Build AdonisJS ----------
FROM deps AS build
COPY . .
RUN node ace build --ignore-ts-errors

# ---------- Image de production ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333
COPY --from=build /app/build ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
# 3333 = API HTTP, 3334 = serveur WebSocket (socket.io)
EXPOSE 3333 3334
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "bin/server.js"]
