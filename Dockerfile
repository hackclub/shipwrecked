# syntax=docker/dockerfile:1
FROM dhi.io/bun:1-debian13-dev AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json bun.lock prisma.config.ts ./
COPY webhook-forwarder/package.json ./webhook-forwarder/package.json
COPY prisma ./prisma
RUN bun install --frozen-lockfile
COPY . .
RUN AIRTABLE_API_KEY=build-placeholder HACKATIME_API_TOKEN=build-placeholder \
    GRAPHITE_HOST=localhost MOCK_API=true bun run build

FROM dhi.io/bun:1-debian13 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9991 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=65532:65532 /app/public ./public
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
USER 65532:65532
EXPOSE 9991
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:9991/api/health/live'); process.exit(r.ok ? 0 : 1)"]
CMD ["bun", "server.js"]
