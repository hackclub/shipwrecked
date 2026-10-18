# Webhook forwarder

Intercepts, modifies and forwards Coolify webhooks to the Shipwrecked bot.

Install dependencies from the repository root with `bun install --frozen-lockfile`.
Run locally with `bun run --cwd webhook-forwarder start`; set
`SLACK_NOTIFICATION_WEBHOOK` and optionally `PORT` (default 3003).

Build from the repository root:

```sh
docker build -f webhook-forwarder/Dockerfile -t shipwrecked:webhook .
```

The image uses the shared Bun lockfile and a non-root DHI Bun runtime. Its liveness
check requests `/` and never forwards a Slack message.
