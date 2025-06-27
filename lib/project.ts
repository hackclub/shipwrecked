import { prisma } from "@/lib/prisma";
import { fetchHackatimeProjects } from "@/lib/hackatime";
import { addHackatimeProjectLink } from "@/lib/hackatime-links";

export type Project = {
    projectID: string
    name: string
    description: string
    codeUrl: string
    playableUrl: string
    screenshot: string
    submitted: boolean
    userId: string
    shipped: boolean
    viral: boolean
    in_review: boolean
}

export type ProjectInput = Omit<Project, 'projectID' | 'submitted'> & {
    hackatimeName?: string; // Keep this in the input for backward compatibility
    hackatimeProjects?: string[]; // For multiple hackatime projects
};
export type ProjectUpdateInput = Partial<Omit<Project, 'projectID' | 'userId' | 'submitted'>>;

export async function createProject(data: ProjectInput) {
    console.log('[createProject-TRACE] 1. Starting project creation with data:', {
        name: data.name,
        description: data.description?.substring(0, 20) + '...',
        hackatimeName: data.hackatimeName || 'N/A',
        hackatimeProjects: data.hackatimeProjects || [],
        userId: data.userId,
        hasCodeUrl: !!data.codeUrl,
        hasPlayableUrl: !!data.playableUrl,
        hasScreenshot: !!data.screenshot
    });
    
    // Ensure hackatime is defined
    const hackatimeName = data.hackatimeName || "";
    const hackatimeProjects = data.hackatimeProjects || [];
    
    // Merge hackatimeName into hackatimeProjects if not already there
    if (hackatimeName && !hackatimeProjects.includes(hackatimeName)) {
        hackatimeProjects.push(hackatimeName);
    }
    
    console.log('[createProject-TRACE] 3. Hackatime projects:', hackatimeProjects);
    
    try {
        console.log('[createProject-TRACE] 5. Preparing project payload');
        // Create a complete payload to log and use for Prisma
        const projectPayload = {
            projectID: crypto.randomUUID(),
            name: data.name || 'Unnamed Project',
            description: data.description || '',
            codeUrl: data.codeUrl || '',
            playableUrl: data.playableUrl || '',
            screenshot: data.screenshot || "",
            userId: data.userId,
            submitted: false,
            shipped: !!data.shipped,
            viral: !!data.viral,
            in_review: !!data.in_review,
        };
        
        console.log('[createProject-TRACE] 6. Project payload created:', {
            ...projectPayload,
            screenshot: projectPayload.screenshot ? `(screenshot data, length: ${projectPayload.screenshot.length})` : '(none)'
        });
        
        // Verify database connection by doing a simple query
        console.log('[createProject-TRACE] 7. Verifying database connection...');
        try {
            const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
            console.log('[createProject-TRACE] 7.1 Database connection verified:', result);
        } catch (connectionError) {
            console.error('[createProject-TRACE] 7.2 Database connection test failed:', connectionError);
            throw new Error('Database connection failed: ' + 
                (connectionError instanceof Error ? connectionError.message : 'Unknown error'));
        }
        
        // Check if userId exists in the database
        console.log(`[createProject-TRACE] 8. Checking if user ${data.userId} exists`);
        let userExists;
        try {
            userExists = await prisma.user.findUnique({
                where: { id: data.userId }
            });
            console.log(`[createProject-TRACE] 8.1 User query result:`, userExists ? 'User found' : 'User NOT found');
        } catch (userLookupError) {
            console.error(`[createProject-TRACE] 8.2 Error looking up user:`, userLookupError);
            throw new Error('Failed to verify user: ' + 
                (userLookupError instanceof Error ? userLookupError.message : 'Unknown error'));
        }
        
        if (!userExists) {
            console.error(`[createProject-TRACE] 8.3 User with ID ${data.userId} not found in database`);
            throw new Error(`User with ID ${data.userId} not found`);
        }
        
        try {
            console.log('[createProject-TRACE] 9. Now creating project in database');
            console.time('[createProject-TRACE] Prisma.project.create execution time');
            
            let creationResult;
            try {
                console.log('[createProject-TRACE] 9.1 Calling prisma.project.create');
                creationResult = await prisma.project.create({
                    data: projectPayload
                });
                console.log('[createProject-TRACE] 9.2 prisma.project.create call completed successfully');
            } catch (innerError: any) {
                console.timeEnd('[createProject-TRACE] Prisma.project.create execution time');
                console.error('[createProject-TRACE] 9.3 Inner execution error during project creation:', innerError);
                if (innerError.code) {
                    console.error('[createProject-TRACE] 9.3.1 Prisma error code:', innerError.code);
                }
                if (innerError.clientVersion) {
                    console.error('[createProject-TRACE] 9.3.2 Prisma client version:', innerError.clientVersion);
                }
                throw innerError;
            }
            
            console.timeEnd('[createProject-TRACE] Prisma.project.create execution time');
            
            if (!creationResult) {
                console.error('[createProject-TRACE] 9.4 Prisma returned null/undefined result without throwing an error');
                throw new Error('Project creation failed - database returned null result');
            }
            
            console.log('[createProject-TRACE] 10. Project created successfully with ID:', creationResult.projectID);
            
            // If hackatime projects are provided, create links to them
            if (hackatimeProjects.length > 0) {
                console.log('[createProject-TRACE] 11. Creating Hackatime project links for:', hackatimeProjects);
                const linkPromises = [];
                
                for (const projectName of hackatimeProjects) {
                    try {
                        linkPromises.push(addHackatimeProjectLink(creationResult.projectID, projectName));
                    } catch (linkError) {
                        console.error(`[createProject-TRACE] 11.2 Error creating Hackatime project link for ${projectName}:`, linkError);
                        // Continue even if one link creation fails
                    }
                }
                
                try {
                    await Promise.allSettled(linkPromises);
                    console.log(`[createProject-TRACE] 11.1 Successfully created ${linkPromises.length} Hackatime project links`);
                } catch (error) {
                    console.error('[createProject-TRACE] 11.3 Error waiting for link creations:', error);
                    // Continue even if link creation fails
                }
            }
            
            return creationResult;
        } catch (prismaError: any) {
            console.error('[createProject-TRACE] 12. Prisma error details:', prismaError);
            
            // Check for known error types
            const errorMessage = prismaError.message || '';
            console.error('[createProject-TRACE] 12.1 Error message:', errorMessage);
            
            if (errorMessage.includes('Unique constraint')) {
                if (errorMessage.includes('projectID')) {
                    // Project ID collision - very unlikely but possible
                    console.error('[createProject-TRACE] 12.2 Project ID collision, retrying with a new ID');
                    
                    // Try once more with a new projectID
                    projectPayload.projectID = crypto.randomUUID();
                    console.log('[createProject-TRACE] 12.3 Retrying with new projectID:', projectPayload.projectID);
                    
                    try {
                        const project = await prisma.project.create({
                            data: projectPayload
                        });
                        console.log('[createProject-TRACE] 12.4 Project created successfully on second attempt:', project.projectID);
                        
                        // If hackatime projects are provided, create links to them
                        if (hackatimeProjects.length > 0) {
                            console.log('[createProject-TRACE] 12.5 Creating Hackatime project links for:', hackatimeProjects);
                            const linkPromises = [];
                            
                            for (const projectName of hackatimeProjects) {
                                try {
                                    linkPromises.push(addHackatimeProjectLink(project.projectID, projectName));
                                } catch (linkError) {
                                    console.error(`[createProject-TRACE] 12.6 Error creating Hackatime project link for ${projectName}:`, linkError);
                                    // Continue even if one link creation fails
                                }
                            }
                            
                            try {
                                await Promise.allSettled(linkPromises);
                                console.log(`[createProject-TRACE] 12.1 Successfully created ${linkPromises.length} Hackatime project links`);
                            } catch (error) {
                                console.error('[createProject-TRACE] 12.3 Error waiting for link creations:', error);
                                // Continue even if link creation fails
                            }
                        }
                        
                        return project;
                    } catch (retryError: any) {
                        console.error('[createProject-TRACE] 12.8 Retry also failed:', retryError);
                        throw new Error('Project creation failed on retry: ' + 
                            (retryError.message || 'Unknown error'));
                    }
                }
            }
            
            // If we got here, it's an error we don't know how to handle
            throw new Error('Project creation failed: ' + 
                (prismaError.message || 'Unknown database error'));
        }
    } catch (error) {
        console.error('[createProject-TRACE] 13. Failed to create project in database:', error);
        if (error instanceof Error) {
            console.error('[createProject-TRACE] 13.1 Error name:', error.name);
            console.error('[createProject-TRACE] 13.2 Error message:', error.message);
            console.error('[createProject-TRACE] 13.3 Error stack:', error.stack);
        }
        throw error; // Re-throw to be handled by the caller
    }
}

export async function deleteProject(projectID: string, userId: string) {
    return prisma.project.delete({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        }
    });
} 

export async function updateProject(projectID: string, userId: string, data: ProjectUpdateInput) {
    return prisma.project.update({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        },
        data
    });
}

export interface ProgressMetrics {
  shippedHours: number;
  viralHours: number;
  otherHours: number;
  totalHours: number;
  totalPercentage: number;
  rawHours: number;
  currency: number;
}

// Helper to get project hours with our matching logic
export function getProjectHackatimeHours(project: any): number {
  // Safety check for null/undefined project
  if (!project) return 0;
  
  // If project has hackatimeLinks, calculate total from all links
  if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
    return project.hackatimeLinks.reduce((sum: number, link: any) => {
      // Use the link's hoursOverride if it exists, otherwise use rawHours
      const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
        ? link.hoursOverride
        : (typeof link.rawHours === 'number' ? link.rawHours : 0);
      
      return sum + effectiveHours;
    }, 0);
  }
  
  // Fallback for backward compatibility - use project-level rawHours
  return project?.rawHours || 0;
}

// Helper to get ONLY approved hours (for clamshell calculation)
export function getProjectApprovedHours(project: any): number {
  // Safety check for null/undefined project
  if (!project) return 0;
  
  // If project has hackatimeLinks, calculate total from ONLY approved hours
  if (project.hackatimeLinks && project.hackatimeLinks.length > 0) {
    return project.hackatimeLinks.reduce((sum: number, link: any) => {
      // Only count hoursOverride as approved hours
      if (link.hoursOverride !== undefined && link.hoursOverride !== null) {
        return sum + link.hoursOverride;
      }
      // No hoursOverride means no approved hours for this link
      return sum;
    }, 0);
  }
  
  // Fallback for backward compatibility - use project-level hoursOverride
  return project?.hoursOverride || 0;
}

// Centralized function to calculate all progress metrics
export function calculateProgressMetrics(projects: any[]): ProgressMetrics {
  if (!projects || !Array.isArray(projects)) {
    return {
      shippedHours: 0,
      viralHours: 0,
      otherHours: 0,
      totalHours: 0,
      totalPercentage: 0,
      rawHours: 0,
      currency: 0
    };
  }

  let shippedHours = 0;
  let viralHours = 0;
  let otherHours = 0;
  let rawHours = 0;
  let currency = 0;

  // Get all projects sorted by hours for both calculations
  const allProjectsWithHours = projects
    .map(project => ({
      project,
      hours: getProjectHackatimeHours(project)
    }))
    .sort((a, b) => b.hours - a.hours);

  // Get top 4 projects for island percentage calculation
  const top4Projects = allProjectsWithHours.slice(0, 4);
  
  // Calculate island percentage from only top 4 projects
  top4Projects.forEach(({ project, hours }) => {
    // Cap hours per project at 15
    let cappedHours = Math.min(hours, 15);
    
    if (project?.viral === true) {
      viralHours += cappedHours;
    } 
    // If it's shipped but not viral - only count if it has approved hours
    else if (project?.shipped === true && getProjectApprovedHours(project) > 0) {
      shippedHours += cappedHours;
    } 
    // Not shipped, not viral, or shipped with no approved hours
    else {
      // Cap non-shipped projects at 14.75 hours
      otherHours += Math.min(cappedHours, 14.75);
    }
  });

  // Calculate clamshells from all projects using ONLY approved hours
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ≈ 1.618
  const top4ProjectIds = new Set(top4Projects.map(({ project }) => project.projectID));
  
  allProjectsWithHours.forEach(({ project, hours }) => {
    rawHours += hours;
    
    // Only generate clamshells for shipped projects using APPROVED hours only
    if (project?.shipped === true) {
      const approvedHours = getProjectApprovedHours(project);
      
      // Only generate clamshells if there are actually approved hours
      if (approvedHours > 0) {
        if (top4ProjectIds.has(project.projectID)) {
          // Top 4 projects: clamshells for approved hours beyond 15 (no cap)
          if (approvedHours > 15) {
            currency += (approvedHours - 15) * (phi * 10);
          }
        } else {
          // All other shipped projects: clamshells for ALL approved hours
          currency += approvedHours * (phi * 10);
        }
      }
    }
  });

  // Calculate total hours (capped at 60 for percentages)
  const totalHours = Math.min(shippedHours + viralHours + otherHours, 60);
  
  // Total progress percentage (capped at 100%)
  const totalPercentage = Math.min((totalHours / 60) * 100, 100);

  return {
    shippedHours,
    viralHours,
    otherHours,
    totalHours,
    totalPercentage,
    rawHours: Math.round(rawHours),
    currency: Math.floor(currency)
  };
}