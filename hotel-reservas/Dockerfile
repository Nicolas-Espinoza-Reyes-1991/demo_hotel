FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
# postinstall ejecuta prisma generate; el schema se copia en builder
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_WEBSITE_URL=
ARG NEXT_PUBLIC_SHOW_DEMO_UI=false
ARG NEXT_PUBLIC_DISPLAY_CURRENCY=CLP
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBSITE_URL
ENV NEXT_PUBLIC_SHOW_DEMO_UI=$NEXT_PUBLIC_SHOW_DEMO_UI
ENV NEXT_PUBLIC_DISPLAY_CURRENCY=$NEXT_PUBLIC_DISPLAY_CURRENCY
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/room-gallery.ts ./src/lib/room-gallery.ts
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p .next/cache public/uploads/rooms \
    && chmod +x docker-entrypoint.sh \
    && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
