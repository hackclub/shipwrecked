#!/bin/sh

# Start the cron service
crond -b -l 8

# Print the cron log
tail -f /var/log/cron.log 