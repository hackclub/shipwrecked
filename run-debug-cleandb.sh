#!/bin/sh

echo "Cleaning up existing database volume..."

# Stop any running containers first
docker-compose -f docker-compose-local-debug.yaml down

# Remove the postgres volume
docker volume rm shipwrecked_postgres_data || { echo "Failed to remove postgres volume"; exit 1; }

echo "Database volume removed. Starting fresh environment..."

# Run the debug script
./run-debug.sh 