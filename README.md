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

### Prerequisites
- Docker with docker-compose
- Environment configuration (see below)

### Environment Setup

1. Copy the example environment file to create your own:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values in your `.env` file.

3. We recommend symlinking `.env.local` to `.env` for Next.js to properly load your environment variables:
   ```bash
   ln -s .env .env.local
   ```

   This ensures that both the development server and any scripts directly reference the same environment file.

### Quick Start

We provide two simple scripts for local development:

1. **Standard Development Setup**
   ```bash
   ./run-debug.sh
   ```
   This script:
   - Starts PostgreSQL and Redis in Docker containers
   - Sets up Prisma with the database
   - Runs migrations
   - Starts the Next.js development server on your host machine

2. **Clean Database Setup** (use this if you need a fresh database)
   ```bash
   ./run-debug-cleandb.sh
   ```
   This script:
   - Removes any existing database volume
   - Performs all the steps in the standard setup with a clean database

That's it! Your development environment will be running and accessible at http://localhost:3000.

## Deployment

### Staging Environment
- Code that lands on the `main` branch is automatically deployed to https://shipwrecked-staging.hackclub.com
- For access details, see #shipwrecked-hq in Hack Club Slack

### Production Environment
- Production is deployed at https://shipwrecked.hackclub.com
- To deploy to production, run `./upgrade-prod.sh` after testing on staging

## Contributing Guidelines

When contributing to this project, please follow these guidelines to ensure a smooth review process and maintain project stability:

### Pull Request Best Practices

1. **For Large Refactors**: If you're making significant changes to a page or component, take an additive approach:
   - Create a new page/component alongside the existing one
   - Don't modify the original until your changes are approved
   - This allows for safe, non-destructive changes

2. **Before Major Changes**: Check with the internal team before starting work on:
   - Large-scale refactors
   - Major UI/UX changes
   - New features that affect core functionality
   
3. **Cross-Device Testing**: We prioritize stability across platforms:
   - All changes must be tested on both desktop and mobile
   - Verify responsive behavior works correctly at different breakpoints
   - Document any device-specific considerations in your PR

4. **Code Style**: Follow the existing patterns in the codebase for consistency

By following these guidelines, you'll help us maintain a stable, high-quality codebase that works well for all users.
