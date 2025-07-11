#!/bin/sh

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

echo "Cleaning up existing database volume..."

# Stop any running containers first (this might free up the ports)
echo "🛑 Stopping any existing Docker services..."
docker-compose -f docker-compose-local-debug.yaml down

# Now check if ports are still blocked by external processes
check_ports

# Remove the postgres volume
docker volume rm shipwrecked_postgres_data || { echo "Failed to remove postgres volume"; exit 1; }

echo "Database volume removed. Starting fresh environment..."

# Run the debug script
./run-debug.sh 