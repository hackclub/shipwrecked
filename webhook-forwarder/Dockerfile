# Build from the repository root: docker build -f webhook-forwarder/Dockerfile .
FROM dhi.io/bun:1.4.3-debian13-dev AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY webhook-forwarder/package.json ./webhook-forwarder/package.json
RUN bun install --frozen-lockfile --production --ignore-scripts --filter webhook-forwarder

FROM dhi.io/bun:1.4.3-debian13
WORKDIR /app
ENV NODE_ENV=production PORT=3003
COPY --from=dependencies --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=dependencies --chown=65532:65532 /app/webhook-forwarder ./webhook-forwarder
COPY --chown=65532:65532 webhook-forwarder/server.js ./webhook-forwarder/server.js
USER 65532:65532
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "const r = await fetch('http://127.0.0.1:3003/'); process.exit(r.ok ? 0 : 1)"]
CMD ["bun", "webhook-forwarder/server.js"]
