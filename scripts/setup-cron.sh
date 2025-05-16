#!/bin/bash
# This script sets up a cron job to run the Hackatime sync script every hour

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_DIR/scripts/sync-hackatime-hours.ts"
LOG_PATH="$PROJECT_DIR/logs/hackatime-sync.log"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Define the cron job command
# Run every hour at minute 0 (e.g., 1:00, 2:00, etc.)
CRON_CMD="0 * * * * cd $PROJECT_DIR && npx tsx $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Check if the cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "$SCRIPT_PATH" || echo "")

if [ -z "$EXISTING_CRON" ]; then
  # Add the cron job
  (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
  echo "Cron job installed. It will run every hour."
  echo "The sync logs will be saved to: $LOG_PATH"
else
  echo "Cron job already exists. No changes made."
  echo "Current cron job: $EXISTING_CRON"
fi

echo ""
echo "To view current cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To remove all cron jobs: crontab -r (use with caution)" 