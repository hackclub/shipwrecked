#!/bin/bash

# Exit on error
set -e

echo "Starting Prisma migration for the Review model..."

# Generate Prisma client
echo "1. Generating Prisma client..."
bun --bun prisma generate

# Create migration
echo "2. Creating migration..."
bun --bun prisma migrate dev --name add_review_model

echo "Migration completed successfully!" 