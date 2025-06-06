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
# Overwrite the standalone server.js with our custom Socket.io server
COPY --from=builder /app/server.js ./server.js

# Install additional dependencies needed for our custom server using yarn
# (Express and Socket.io are not included in Next.js standalone build)
RUN yarn add express@^4.19.2 socket.io@^4.8.0 --ignore-engines

# Ensure the nextjs user owns all files and has proper permissions
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /app

USER nextjs

EXPOSE 9991

ENV PORT 9991
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 
