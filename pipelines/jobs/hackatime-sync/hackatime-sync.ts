#!/usr/bin/env tsx
/**
 * Synchronize Hackatime hours with the database
 * 
 * This script:
 * 1. Fetches all users with hackatimeId
 * 2. For each user, fetches their Hackatime projects
 * 3. Updates HackatimeProjectLink records with the latest rawHours
 */

import { PrismaClient } from '../../../app/generated/prisma/client';
import * as dotenv from 'dotenv';
import { exponentialFetchRetry } from '../exponentialRetry/exponentialRetry';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error']
});

// Hackatime API base URL and token
const HACKATIME_API_URL = process.env.HACKATIME_API_URL || 'https://hackatime.hackclub.com/api';
const HACKATIME_API_TOKEN = process.env.HACKATIME_API_TOKEN;

if (!HACKATIME_API_TOKEN) {
  console.error('HACKATIME_API_TOKEN environment variable must be set');
  process.exit(1);
}

interface HackatimeProject {
  name: string;
  total_seconds: number;
  hours: number; // Keep for backward compatibility, but we'll use total_seconds for precision
}

interface UpdatedLink {
  projectName: string;
  hackatimeName: string;
  oldHours: number;
  newHours: number;
}

async function getHackatimeProjects(hackatimeId: string): Promise<HackatimeProject[]> {
  try {
    const uri = `${HACKATIME_API_URL}/v1/users/${hackatimeId}/stats?features=projects&start_date=2025-04-22`;
    
    const response = await exponentialFetchRetry(uri, {
      headers: {
        'Authorization': `Bearer ${HACKATIME_API_TOKEN}`,
        'Rack-Attack-Bypass': `${HACKATIME_API_TOKEN}`
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching Hackatime projects for user ${hackatimeId}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data || !data.data || !data.data.projects || !Array.isArray(data.data.projects)) {
      console.error(`Unexpected response format for user ${hackatimeId}`);
      return [];
    }
    
    return data.data.projects as HackatimeProject[];
  } catch (error) {
    console.error(`Failed to fetch Hackatime projects for user ${hackatimeId}:`, error);
    return [];
  }
}

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting Hackatime hours synchronization...`);
  
  try {
    console.log('Connecting to database...');
    
    // Find all users with hackatimeId
    const users = await prisma.user.findMany({
      where: { 
        hackatimeId: { 
          not: null 
        } 
      },
      select: {
        id: true,
        name: true,
        email: true,
        hackatimeId: true
      }
    });
    
    console.log(`Found ${users.length} users with Hackatime IDs`);
    
    let totalUpdatedLinks = 0;
    
    // Process each user
    for (const user of users) {
      if (!user.hackatimeId) continue;
      
      console.log(`Processing user ${user.name || user.email || user.id} (Hackatime ID: ${user.hackatimeId})`);
      
      try {
        // Get Hackatime projects for this user
        const hackatimeProjects = await getHackatimeProjects(user.hackatimeId);
        
        if (!hackatimeProjects || hackatimeProjects.length === 0) {
          console.log(`No Hackatime projects found for user ${user.id}`);
          continue;
        }
        
        // Get all projects for this user with their Hackatime links
        const userProjects = await prisma.project.findMany({
          where: { userId: user.id },
          select: {
            projectID: true,
            name: true,
            hackatimeLinks: {
              select: {
                id: true,
                hackatimeName: true,
                rawHours: true
              }
            }
          }
        });
        
        // Track which links were updated
        const updatedLinks: UpdatedLink[] = [];
        
        // Update each HackatimeProjectLink with matching hackatime name
        for (const project of userProjects) {
          for (const link of project.hackatimeLinks) {
            const hackatimeProject = hackatimeProjects.find(hp => hp.name === link.hackatimeName);
            
            if (hackatimeProject) {
              // Calculate precise hours from total_seconds and round to 2 decimal places for aesthetics
              const hours = Math.round((hackatimeProject.total_seconds / 3600) * 100) / 100;
              
              // Only update if hours are different to avoid unnecessary database writes
              if (link.rawHours !== hours) {
                try {
                  await prisma.hackatimeProjectLink.update({
                    where: { id: link.id },
                    data: { rawHours: hours }
                  });
                  
                  // Track the update
                  updatedLinks.push({
                    projectName: project.name,
                    hackatimeName: link.hackatimeName,
                    oldHours: link.rawHours,
                    newHours: hours
                  });
                } catch (updateError) {
                  console.error(`Failed to update link ${link.hackatimeName}:`, updateError);
                }
              }
            }
          }
        }
        
        if (updatedLinks.length > 0) {
          console.log(`Updated ${updatedLinks.length} Hackatime links for user ${user.id}:`);
          for (const link of updatedLinks) {
            console.log(`  - ${link.projectName} -> ${link.hackatimeName}: ${link.oldHours} -> ${link.newHours} hours`);
          }
          totalUpdatedLinks += updatedLinks.length;
        } else {
          console.log(`No Hackatime links needed updating for user ${user.id}`);
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }
    
    console.log(`Synchronization completed successfully. Updated ${totalUpdatedLinks} total Hackatime links.`);
  } catch (error) {
    console.error(`Error during synchronization:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main(); 
