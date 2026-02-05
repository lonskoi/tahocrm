FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma Client is generated at build time
RUN npm run db:generate
RUN npm run build

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY scripts ./scripts
COPY lib ./lib
COPY types ./types
COPY tsconfig.json ./tsconfig.json
COPY package.json package-lock.json ./
CMD ["npx", "prisma", "db", "push"]

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 nextjs -G nodejs

# Next.js standalone output (next.config.ts: output=\"standalone\")
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ensure bcryptjs exists at runtime (standalone tracing can omit it)
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
