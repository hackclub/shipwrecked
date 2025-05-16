#!/usr/bin/env ts-node
/**
 * Synchronize Hackatime hours with the database
 * 
 * This script:
 * 1. Fetches all users with hackatimeId
 * 2. For each user, fetches their Hackatime projects
 * 3. Updates all projects in the database with the latest rawHours
 * 
 * Run as:
 * npx ts-node scripts/sync-hackatime-hours.ts
 */

import { prisma } from '../lib/prisma';
import { fetchHackatimeProjects } from '../lib/hackatime';
import { HackatimeProject } from '../types/hackatime';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Hackatime API base URL and token
const HACKATIME_API_URL = process.env.HACKATIME_API_URL || 'https://hackatime.hackclub.com/api';
const HACKATIME_API_TOKEN = process.env.HACKATIME_API_TOKEN;

if (!HACKATIME_API_TOKEN) {
  console.error('HACKATIME_API_TOKEN environment variable must be set');
  process.exit(1);
}

interface UpdatedProject {
  name: string;
  hackatime: string;
  oldHours: number;
  newHours: number;
}

async function getHackatimeProjects(hackatimeId: string): Promise<HackatimeProject[]> {
  try {
    // Use the correct endpoint format following lib/hackatime.ts
    const uri = `${HACKATIME_API_URL}/v1/users/${hackatimeId}/stats?features=projects&start_date=2025-04-22`;
    console.log(`📡 Hackatime API Request: ${uri}`);
    
    const response = await fetch(uri, {
      headers: {
        'Authorization': `Bearer ${HACKATIME_API_TOKEN}`
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
    
    console.log(`Found ${data.data.projects.length} Hackatime projects for user ${hackatimeId}`);
    return data.data.projects as HackatimeProject[];
  } catch (error) {
    console.error(`Failed to fetch Hackatime projects for user ${hackatimeId}:`, error);
    return [];
  }
}

async function updateProjectHours(userId: string, hackatimeProjects: HackatimeProject[]): Promise<void> {
  // Get all projects for this user
  const userProjects = await prisma.project.findMany({
    where: { userId }
  });
  
  // Track which projects were updated
  const updatedProjects: UpdatedProject[] = [];
  
  // Update each project with matching hackatime name
  for (const project of userProjects) {
    if (!project.hackatime) continue;
    
    const hackatimeProject = hackatimeProjects.find(hp => hp.name === project.hackatime);
    
    if (hackatimeProject) {
      // Get hours from the hackatime project
      const hours = hackatimeProject.hours || 0;
      
      // Only update if hours are different to avoid unnecessary database writes
      if (project.rawHours !== hours) {
        await prisma.project.update({
          where: { projectID: project.projectID },
          data: { rawHours: hours }
        });
        
        updatedProjects.push({
          name: project.name,
          hackatime: project.hackatime, 
          oldHours: project.rawHours,
          newHours: hours
        });
      }
    }
  }
  
  if (updatedProjects.length > 0) {
    console.log(`Updated ${updatedProjects.length} projects for user ${userId}:`);
    for (const project of updatedProjects) {
      console.log(`  - ${project.name}: ${project.oldHours} -> ${project.newHours} hours`);
    }
  } else {
    console.log(`No projects needed updating for user ${userId}`);
  }
}

async function main(): Promise<void> {
  const startTime = performance.now();
  console.log(`[${new Date().toISOString()}] Starting Hackatime hours synchronization...`);
  
  try {
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
    
    // Process each user
    for (const user of users) {
      if (!user.hackatimeId) continue;
      
      console.log(`Processing user ${user.name || user.email || user.id} (Hackatime ID: ${user.hackatimeId})`);
      
      try {
        // Get Hackatime projects for this user
        const hackatimeProjects = await fetchHackatimeProjects(user.hackatimeId);
        
        if (!hackatimeProjects || hackatimeProjects.length === 0) {
          console.log(`No Hackatime projects found for user ${user.id}`);
          continue;
        }
        
        // Get all projects for this user
        const userProjects = await prisma.project.findMany({
          where: { userId: user.id }
        });
        
        // Track which projects were updated
        const updatedProjects: UpdatedProject[] = [];
        
        // Update each project with matching hackatime name
        for (const project of userProjects) {
          if (!project.hackatime) continue;
          
          const hackatimeProject = hackatimeProjects.find(hp => hp.name === project.hackatime);
          
          if (hackatimeProject) {
            // Get hours from the hackatime project
            const hours = hackatimeProject.hours || 0;
            
            // Only update if hours are different to avoid unnecessary database writes
            if (project.rawHours !== hours) {
              await prisma.project.update({
                where: { projectID: project.projectID },
                data: { rawHours: hours }
              });
              
              // Track the update
              updatedProjects.push({
                name: project.name,
                hackatime: project.hackatime,
                oldHours: project.rawHours,
                newHours: hours
              });
            }
          }
        }
        
        if (updatedProjects.length > 0) {
          console.log(`Updated ${updatedProjects.length} projects for user ${user.id}:`);
          for (const project of updatedProjects) {
            console.log(`  - ${project.name}: ${project.oldHours} -> ${project.newHours} hours`);
          }
        } else {
          console.log(`No projects needed updating for user ${user.id}`);
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Synchronization completed in ${duration.toFixed(2)} seconds`);
  } catch (error) {
    console.error(`Error during synchronization:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main();

// Export for importing in other files
export { main as syncHackatimeHours }; 