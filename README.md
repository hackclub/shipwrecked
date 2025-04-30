# Shipwrecked

Shipwrecked is a once-in-a-lifetime, four-day flagship hackathon organized by Hack Club, a 501(c)(3) nonprofit that supports a global community of over 50,000 high school makers. The event takes place on Cathleen Stone Island in the Boston Harbor, where 130 hackers will gather for a unique story-based hackathon experience.

## About the Event

On **August 8-11, 2025**, participants will work together to survive on the island they've been stranded on. The event features:
- A story-based hackathon experience
- Collaborative quests and challenges
- Workshops and sessions for all skill levels
- A blend of outdoor adventure and tech creativity
- A safe, wholesome, and collaborative environment

## The Bay

Before Shipwrecked, participants earn their spot through "The Bay" - a 3-month online event where they:
- Build 4 projects (about 15 hours each)
- Make their projects go viral
- Connect with other makers through The Pier (our video game-like digital meeting space)

## Local Development

### Minimum Dev Prerequisites
- docker
- ```.env``` file containing third-party secrets (Airtable, etc).  See #shipwrecked-hq on Hack Club Slack for more details.

### docker-compose
To run the project in a local Docker environment with temporary resources:

1. Build the Docker image:
```shell
./build.sh
```

2. Start the services:
```shell
./run.sh
```

This will start:
- The Next.js application
- PostgreSQL database
- Redis cache
- All necessary environment variables and connections

## Local Development with Docker Services

For local development, you can run just the database services (Postgres and Redis) in Docker while running the Next.js application directly on your host machine:

1. Start the services:
```bash
docker compose -f docker-compose-local-dev.yaml up -d
```

2. The following services will be available:
   - PostgreSQL: `postgresql://postgres:postgres@localhost:5432/shipwrecked`
   - Redis: `redis://localhost:6379`

3. Run the Next.js application locally:
```bash
yarn dev
```

You can override the database connections by setting environment variables:
- `DATABASE_URL`: Override the PostgreSQL connection string
- `REDIS_URL`: Override the Redis connection string

Example `.env.local`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shipwrecked
REDIS_URL=redis://localhost:6379
```

## Deployment

### Staging Environment
- Code that lands on the `main` branch is automatically deployed to https://shipwrecked-staging.hackclub.com
- This is our testing environment where changes are verified before going to production
- We currently keep this under password.  See #shipwrecked-hq in Hack Club Slack for details.

### Production Environment
- Production is deployed at https://shipwrecked.hackclub.com
- To deploy to production:
  1. Ensure your changes are tested on staging
  2. Run `./upgrade-prod.sh` to promote the changes to production
  3. The script will perform necessary checks and guide you through the process
