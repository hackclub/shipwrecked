#!/bin/sh

# Stop any existing services
docker-compose -f docker-compose-local-debug.yaml down

# Start services in the background
docker-compose -f docker-compose-local-debug.yaml up --build -d

echo "Starting services..."

# Wait for PostgreSQL to be ready
for i in {1..10}; do
  if docker-compose -f docker-compose-local-debug.yaml exec postgres pg_isready -U postgres > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for PostgreSQL to be ready... ($i/10)"
  sleep 1
done

# Wait for Redis to be ready
for i in {1..5}; do
  if docker-compose -f docker-compose-local-debug.yaml exec redis redis-cli ping > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for Redis to be ready... ($i/5)"
  sleep 1
done

echo "Services are ready! Starting Next.js development server..."

# Run the Next.js development server
yarn dev 
