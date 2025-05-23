#!/usr/bin/env tsx

import { PrismaClient } from '../app/generated/prisma/client';
import * as fs from 'fs';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Migration script to create HackatimeProjectLink records from existing Project.hackatime values
 * 
 * This script:
 * 1. Exports existing hackatime and rawHours data from Project model
 * 2. Creates HackatimeProjectLink records for each project
 * 
 * RUN THIS SCRIPT BEFORE REMOVING THE HACKATIME AND RAWHOURS FIELDS FROM THE SCHEMA!
 */
async function migrateHackatimeLinks() {
  console.log('Starting migration of Hackatime project links...');

  try {
    // Get all projects with existing Hackatime project names
    // Use raw query to access fields that may no longer be in the schema
    const projects = await prisma.$queryRaw`
      SELECT "projectID", "userId", "hackatime", "rawHours"  
      FROM "Project" 
      WHERE "hackatime" <> ''
    `;

    console.log(`Found ${Array.isArray(projects) ? projects.length : 0} projects with Hackatime references to migrate`);

    // Create a backup of the data first
    const backupPath = './hackatime-links-backup.json';
    fs.writeFileSync(backupPath, JSON.stringify(projects, null, 2));
    console.log(`Backup saved to ${backupPath}`);

    // Create HackatimeProjectLink entries for each project
    let successCount = 0;
    let errorCount = 0;

    for (const project of Array.isArray(projects) ? projects : []) {
      try {
        if (!project.hackatime || project.hackatime.trim() === '') {
          console.log(`Skipping project ${project.projectID} with empty Hackatime name`);
          continue;
        }

        // Create a new link record
        await prisma.hackatimeProjectLink.create({
          data: {
            projectID: project.projectID,
            hackatimeName: project.hackatime,
            rawHours: typeof project.rawHours === 'number' ? project.rawHours : 0
          }
        });

        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`Migrated ${successCount} projects so far...`);
        }
      } catch (error) {
        console.error(`Error migrating project ${project.projectID}:`, error);
        errorCount++;
      }
    }

    console.log(`Migration completed: ${successCount} successful, ${errorCount} errors`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateHackatimeLinks()
  .catch(error => {
    console.error('Error in migration script:', error);
    process.exit(1);
  }); 