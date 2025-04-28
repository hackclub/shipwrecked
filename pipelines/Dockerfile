FROM alpine:3.19

# Add edge/testing repository for Python 3.12
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

# Install cron and other necessary packages
RUN apk add --no-cache \
    dcron \
    curl \
    python3.12 \
    py3.12-requests \
    py3.12-dotenv

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Copy the jobs directory
COPY jobs /usr/local/bin/jobs

# Copy the crontab file
COPY crontab /etc/crontabs/root

# Create the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run the entrypoint script
ENTRYPOINT ["/entrypoint.sh"] 