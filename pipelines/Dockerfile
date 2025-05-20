FROM node:20-alpine

# Install cron and other necessary packages
RUN apk add --no-cache \
    dcron \
    curl \
    python3 \
    py3-requests \
    py3-dotenv \
    py3-pip \
    python3-dev \
    build-base \
    libffi-dev

# Environment variables
ENV NODE_ENV production

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Create workspace directory
WORKDIR /app

# Copy everything at once to avoid file-not-found errors with individual files
COPY . .

# Install Node.js dependencies
RUN if [ -f "package.json" ]; then \
      yarn install --frozen-lockfile || npm install; \
    else \
      echo "No package.json found, skipping dependency installation"; \
    fi

# Install tsx globally for running TypeScript scripts
RUN npm install -g tsx

# Generate Prisma client if schema exists
RUN if [ -f "./prisma/schema.prisma" ]; then \
      npx prisma generate; \
    else \
      echo "Prisma schema not found, skipping generation"; \
    fi

# Copy the crontab file to the correct location
RUN cp /app/pipelines/crontab /etc/crontabs/root

# Create the entrypoint script
RUN cp /app/pipelines/entrypoint.sh /entrypoint.sh && chmod +x /entrypoint.sh

# Run the entrypoint script
ENTRYPOINT ["/entrypoint.sh"] 