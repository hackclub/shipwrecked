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

echo "Services are ready! Setting up Prisma..."

# Create necessary directories for Prisma
mkdir -p generated/prisma/runtime || { echo "Failed to create Prisma directories"; exit 1; }
chmod -R 777 generated || { echo "Failed to set permissions"; exit 1; }

# Generate Prisma client and run migrations
echo "Generating Prisma client..."
npx prisma generate || { echo "Prisma client generation failed"; exit 1; }

echo "Running Prisma migrations..."
npx prisma migrate deploy || { echo "Prisma migrations failed"; exit 1; }

echo "Prisma setup complete! Starting Next.js development server..."

# Upload schema changes to the database first
yarn prisma db push || { echo "Prisma db push failed"; exit 1; }

# Run the Next.js development server
yarn dev 
