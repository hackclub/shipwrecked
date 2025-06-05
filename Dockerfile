# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
ENV AIRTABLE_API_KEY=testing
ENV HACKATIME_API_TOKEN=testing
ENV GRAPHITE_HOST=localhost
RUN yarn build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the entire application (source + built artifacts)
COPY --from=builder --chown=nextjs:nodejs /app .

# Ensure the nextjs user can write to cache directory
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache

USER nextjs

EXPOSE 9991

ENV PORT 9991
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 
