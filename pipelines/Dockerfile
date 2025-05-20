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

# Create the log file
RUN touch /var/log/cron.log

# Create workspace directory
WORKDIR /app

# Copy package files and prisma schema first to leverage layer caching
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN yarn install --frozen-lockfile
RUN npx prisma generate

# Install tsx globally
RUN npm install -g tsx

# Ensure node_modules/@prisma/client is accessible
# This allows using @prisma/client imports that work in both local and Docker environments
RUN mkdir -p /app/node_modules/@prisma
RUN ln -sf /app/app/generated/prisma /app/node_modules/@prisma/client

# Copy the entire pipelines directory to preserve hierarchy
COPY pipelines /app/pipelines

# Copy app directory to ensure proper imports
COPY app /app/app

# Copy the crontab and entrypoint files
COPY pipelines/crontab /etc/crontabs/root
COPY pipelines/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"] 