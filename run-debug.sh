#!/bin/bash

# Check if Docker is running
check_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running or not accessible"
    echo "Please start Docker and try again"
    exit 1
  fi
  echo "✅ Docker is running"
}

# Check if required ports are available (after Docker shutdown)
check_ports() {
  local ports="5432 6379"  # PostgreSQL and Redis
  local failed_ports=""
  
  for port in $ports; do
    if lsof -i :$port >/dev/null 2>&1; then
      failed_ports="$failed_ports $port"
    fi
  done
  
  if [ ! -z "$failed_ports" ]; then
    echo "❌ Error: Required ports are still in use by external processes:$failed_ports"
    echo "Please stop the services using these ports:"
    for port in $failed_ports; do
      echo "  Port $port: $(lsof -i :$port | tail -n +2 | awk '{print $1}' | sort -u | tr '\n' ' ')"
    done
    echo "Then try again."
    exit 1
  fi
  echo "✅ Required ports (5432, 6379) are available"
}

# Check Docker status first
check_docker

# Stop any existing services first (this might free up the ports)
echo "🛑 Stopping any existing Docker services..."
docker compose -f docker-compose-local-debug.yaml down

# Now check if ports are still blocked by external processes
check_ports

# Start services in the background
echo "🚀 Starting Docker services..."
docker compose -f docker-compose-local-debug.yaml up --build -d

echo "Starting services..."

# Wait for PostgreSQL to be ready
for i in {1..10}; do
  if docker compose -f docker-compose-local-debug.yaml exec postgres pg_isready -U postgres > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for PostgreSQL to be ready... ($i/10)"
  sleep 1
done

# Wait for Redis to be ready
for i in {1..5}; do
  if docker compose -f docker-compose-local-debug.yaml exec redis redis-cli ping > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for Redis to be ready... ($i/5)"
  sleep 1
done

echo "Services are ready! Setting up Prisma..."

bun install --frozen-lockfile || exit 1

# Generate Prisma client and run migrations
echo "Generating Prisma client..."
bun --bun prisma generate || { echo "Prisma client generation failed"; exit 1; }

echo "Running Prisma migrations..."
bun --bun prisma migrate deploy || { echo "Prisma migrations failed"; exit 1; }

echo "Prisma setup complete! Starting Next.js development server..."

# Upload schema changes to the database first
bun --bun prisma db push || { echo "Prisma db push failed"; exit 1; }

# Run the Next.js development server
bun run dev
