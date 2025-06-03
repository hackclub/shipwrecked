import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    // Check for valid session - user must be logged in
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching all projects for gallery...');
    
    // Fetch all projects from all users with user info and hackatime links
    const allProjects = await prisma.project.findMany({
      select: {
        projectID: true,
        name: true,
        description: true,
        codeUrl: true,
        playableUrl: true,
        screenshot: true,
        shipped: true,
        viral: true,
        userId: true,
        hackatimeLinks: true,
      },
    });

    // Enhance the project data with computed properties (similar to regular projects API)
    const enhancedProjects = allProjects.map((project) => {
      // Get the main Hackatime name (for backwards compatibility)
      const hackatimeName = project.hackatimeLinks.length > 0 
        ? project.hackatimeLinks[0].hackatimeName 
        : '';
      
      // Calculate total raw hours from all links, applying individual overrides when available
      const rawHours = project.hackatimeLinks.reduce(
        (sum, link) => {
          // Use the link's hoursOverride if it exists, otherwise use rawHours
          const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
            ? link.hoursOverride
            : (typeof link.rawHours === 'number' ? link.rawHours : 0);
          
          return sum + effectiveHours;
        }, 
        0
      );
      
      // Return the enhanced project with additional properties
      return {
        ...project,
        hackatimeName,
        rawHours
      };
    });

    console.log(`Found ${enhancedProjects.length} projects for gallery`);
    return NextResponse.json(enhancedProjects);
  } catch (error) {
    console.error('Error fetching gallery projects:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery projects' }, { status: 500 });
  }
} 