# =============================================================================
#  AgriMind Backend – Multi-stage Docker build (Node.js 20 / Alpine)
# =============================================================================

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Build TypeScript ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before build
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 express

# Copy built assets
COPY --from=builder --chown=express:nodejs /app/dist         ./dist
COPY --from=builder --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/prisma       ./prisma
COPY --from=builder --chown=express:nodejs /app/package.json ./package.json

USER express
EXPOSE 4000

# Run DB migration then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
