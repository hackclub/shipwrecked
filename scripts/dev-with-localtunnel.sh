#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3000}

echo "[dev-with-localtunnel] Starting localtunnel to http://localhost:${PORT} ..."

rm -f .localtunnel.log || true

start_lt() {
  npx -y localtunnel --port ${PORT} > .localtunnel.log 2>&1 &
  LT_PID=$!
  echo "[dev-with-localtunnel] localtunnel pid: ${LT_PID} (logs: ./.localtunnel.log)"
}

cleanup() {
  echo "[dev-with-localtunnel] Shutting down..."
  if [[ -n "${LT_PID:-}" ]]; then
    kill ${LT_PID} >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

start_lt

echo -n "[dev-with-localtunnel] Waiting for public URL"
PUBLIC_URL=""
for i in {1..90}; do
  if [[ -f .localtunnel.log ]]; then
    PUBLIC_URL=$(grep -o 'https://[^ ]*' .localtunnel.log | head -n1 || true)
    if [[ -n "${PUBLIC_URL}" ]]; then
      echo " -> ${PUBLIC_URL}"
      export PUBLIC_ORIGIN=${PUBLIC_URL}
      break
    fi
  fi
  echo -n "."
  sleep 1
done

if [[ -z "${PUBLIC_ORIGIN:-}" ]]; then
  echo ""
  echo "[dev-with-localtunnel] Failed to determine public URL (timeout). See .localtunnel.log." >&2
  exit 1
fi

echo "[dev-with-localtunnel] PUBLIC_ORIGIN=${PUBLIC_ORIGIN}"
echo "[dev-with-localtunnel] Launching ./run-debug.sh with PUBLIC_ORIGIN set"

PUBLIC_ORIGIN=${PUBLIC_ORIGIN} ./run-debug.sh


