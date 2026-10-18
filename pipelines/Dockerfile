# Cron and Python need a shell and OS packages; the web app uses shell-free DHI.
FROM oven/bun:1.4.3-alpine
USER root
RUN apk add --no-cache dcron python3 py3-pip \
    && python3 -m venv /opt/venv
ENV NODE_ENV=production
WORKDIR /app
COPY pipelines/jobs/ip2geo/ip2geo_requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt
COPY package.json bun.lock prisma.config.ts ./
COPY webhook-forwarder/package.json ./webhook-forwarder/package.json
COPY prisma ./prisma
RUN bun install --frozen-lockfile
COPY pipelines ./pipelines
COPY app ./app
COPY lib ./lib
COPY tsconfig.json metrics.ts ./
COPY pipelines/crontab /etc/crontabs/root
COPY pipelines/entrypoint.sh /entrypoint.sh
RUN /opt/venv/bin/python -m compileall -q /app/pipelines/jobs/ip2geo \
    && touch /var/log/cron.log && chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
