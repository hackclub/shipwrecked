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

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 9991

ENV PORT 9991
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 
