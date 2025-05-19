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

# Environment variables (same as the main app)
ENV NODE_ENV production

# Install Python packages using apk where possible, fall back to pip only if needed
RUN pip3 install --break-system-packages prisma-client-py

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Copy the jobs directory
COPY jobs /usr/local/bin/jobs

# Copy the package.json and install dependencies
COPY package.json yarn.lock /usr/local/bin/
WORKDIR /usr/local/bin
RUN yarn install --frozen-lockfile --production

# Copy the crontab file
COPY crontab /etc/crontabs/root

# Create the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run the entrypoint script
ENTRYPOINT ["/entrypoint.sh"] 