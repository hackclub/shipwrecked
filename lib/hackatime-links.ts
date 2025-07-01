import { prisma } from "@/lib/prisma";
import { fetchHackatimeProjects } from "@/lib/hackatime";
import { HackatimeProject } from "@/types/hackatime";

/**
 * Add a new Hackatime project link to a Bay project
 */
export async function addHackatimeProjectLink(
  projectID: string,
  hackatimeName: string
) {
  try {
    // Reject attempts to link <<LAST_PROJECT>>
    if (hackatimeName === '<<LAST_PROJECT>>') {
      throw new Error('The project "<<LAST_PROJECT>>" cannot be linked');
    }
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { projectID },
      include: { hackatimeLinks: true }
    });

    if (!project) {
      throw new Error(`Project with ID ${projectID} not found`);
    }

    // Check if link already exists
    const existingLink = project.hackatimeLinks.find(
      link => link.hackatimeName === hackatimeName
    );

    if (existingLink) {
      throw new Error(`Hackatime project ${hackatimeName} is already linked to this project`);
    }

    // Get user's Hackatime projects to verify the project exists and get hours
    const user = await prisma.user.findUnique({
      where: { id: project.userId },
      select: { hackatimeId: true }
    });

    if (!user?.hackatimeId) {
      throw new Error("User does not have a Hackatime account connected");
    }

    const hackatimeProjects = await fetchHackatimeProjects(user.hackatimeId);
    
    // Find the matching Hackatime project
    const hackatimeProject = hackatimeProjects.find(hp => hp.name === hackatimeName);
    
    if (!hackatimeProject) {
      throw new Error(`Hackatime project "${hackatimeName}" not found in user's projects`);
    }

    // Log the hours from the Hackatime project
    console.log(`Found Hackatime project "${hackatimeName}" with hours:`, {
      hours: hackatimeProject.hours,
      total_seconds: hackatimeProject.total_seconds
    });

    // Create the link
    const link = await prisma.hackatimeProjectLink.create({
      data: {
        projectID,
        hackatimeName,
        rawHours: hackatimeProject.hours || 0
      }
    });

    return link;
  } catch (error) {
    console.error(`Error adding Hackatime project link:`, error);
    throw error;
  }
}

/**
 * Remove a Hackatime project link from a Bay project using link ID
 */
export async function removeHackatimeProjectLink(
  projectID: string, 
  linkId: string
) {
  try {
    // Validate inputs
    if (!projectID) {
      throw new Error("Project ID is required");
    }
    
    if (!linkId) {
      throw new Error("Link ID is required");
    }

    // Check if link exists and belongs to the project
    const link = await prisma.hackatimeProjectLink.findFirst({
      where: {
        id: linkId,
        projectID
      },
      include: {
        project: true
      }
    });

    if (!link) {
      throw new Error(`Link not found or does not belong to project ${projectID}`);
    }

    // Delete the link
    await prisma.hackatimeProjectLink.delete({
      where: {
        id: linkId
      }
    });

    console.log(`Successfully removed Hackatime link ${linkId} (${link.hackatimeName}) from project ${projectID}`);
    return true;
  } catch (error) {
    console.error(`Error removing Hackatime project link:`, error);
    throw error;
  }
}

/**
 * Remove a Hackatime project link from a Bay project using Hackatime project name
 */
export async function removeHackatimeProjectLinkByName(
  projectID: string, 
  hackatimeName: string
) {
  try {
    // Validate inputs
    if (!projectID) {
      throw new Error("Project ID is required");
    }
    
    if (!hackatimeName) {
      throw new Error("Hackatime project name is required");
    }

    // Check if link exists and belongs to the project
    const link = await prisma.hackatimeProjectLink.findFirst({
      where: {
        hackatimeName,
        projectID
      },
      include: {
        project: true
      }
    });

    if (!link) {
      throw new Error(`Link with name "${hackatimeName}" not found or does not belong to project ${projectID}`);
    }

    // Delete the link
    await prisma.hackatimeProjectLink.delete({
      where: {
        id: link.id
      }
    });

    console.log(`Successfully removed Hackatime link ${link.id} (${hackatimeName}) from project ${projectID}`);
    return true;
  } catch (error) {
    console.error(`Error removing Hackatime project link by name:`, error);
    throw error;
  }
}

/**
 * Get all Hackatime project links for a Bay project
 */
export async function getHackatimeProjectLinks(projectID: string) {
  try {
    const links = await prisma.hackatimeProjectLink.findMany({
      where: { projectID }
    });

    return links;
  } catch (error) {
    console.error(`Error getting Hackatime project links:`, error);
    throw error;
  }
}

/**
 * Get the total raw hours for a project by summing all linked Hackatime projects
 */
export async function getProjectTotalRawHours(projectID: string): Promise<number> {
  try {
    // Get all linked Hackatime projects
    const links = await prisma.hackatimeProjectLink.findMany({
      where: { projectID },
      select: { rawHours: true, hoursOverride: true }
    });

    // Sum up the hours, using hoursOverride if available for each link
    const totalRawHours = links.reduce((sum, link) => {
      const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
        ? link.hoursOverride
        : link.rawHours;
      return sum + effectiveHours;
    }, 0);

    return totalRawHours;
  } catch (error) {
    console.error(`Error calculating project total hours:`, error);
    throw error;
  }
}

/**
 * Get the total effective hours for a project
 * This calculates based on individual link overrides
 */
export async function getProjectEffectiveHours(projectID: string): Promise<number> {
  try {
    // Calculate the total of all links with their individual overrides
    const totalRawHours = await getProjectTotalRawHours(projectID);
    return totalRawHours;
  } catch (error) {
    console.error(`Error calculating project effective hours:`, error);
    throw error;
  }
}

/**
 * Sync hours for all Hackatime projects linked to a Bay project
 */
export async function syncHackatimeProjectHours(projectID: string) {
  try {
    // Get the project with user and links
    const project = await prisma.project.findUnique({
      where: { projectID },
      include: { 
        user: true,
        hackatimeLinks: true
      }
    });

    if (!project) {
      throw new Error(`Project with ID ${projectID} not found`);
    }

    if (!project.user.hackatimeId) {
      throw new Error(`User does not have a Hackatime account connected`);
    }

    // Fetch the latest Hackatime projects
    const hackatimeProjects = await fetchHackatimeProjects(project.user.hackatimeId);

    // Update hours for each link
    for (const link of project.hackatimeLinks) {
      const hackatimeProject = hackatimeProjects.find(hp => hp.name === link.hackatimeName);
      
      if (hackatimeProject) {
        // Calculate precise hours from total_seconds and round to 2 decimal places for aesthetics
        const preciseHours = Math.round((hackatimeProject.total_seconds / 3600) * 100) / 100;
        
        // Keep the existing hoursOverride, just update rawHours
        await prisma.hackatimeProjectLink.update({
          where: { id: link.id },
          data: { 
            rawHours: preciseHours,
            // Don't modify the existing hoursOverride
            hoursOverride: link.hoursOverride 
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error(`Error syncing Hackatime project hours:`, error);
    throw error;
  }
} 