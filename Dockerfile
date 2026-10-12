# ---------- Dépendances ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat \
 && corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm config set store-dir /pnpm/store && pnpm install --frozen-lockfile --network-concurrency=4 --fetch-retries=6 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# ---------- Build Next.js ----------
FROM deps AS build
COPY . .
# Les variables NEXT_PUBLIC_* sont figées dans le bundle au moment du build :
# ce sont les URLs que le NAVIGATEUR utilise pour joindre le backend.
ARG NEXT_PUBLIC_API_URL=http://localhost:3333/api/
ARG NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3334
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------- Image de production (standalone) ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
