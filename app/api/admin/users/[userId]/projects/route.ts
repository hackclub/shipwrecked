import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check for admin role or isAdmin flag
  const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { userId } = await params;
    
    // Get projects with their Hackatime links for the specified user
    const projects = await prisma.project.findMany({
      where: {
        userId: userId
      },
      include: {
        hackatimeLinks: true
      }
    });
    
    // Enhance the project data with computed properties (same logic as regular projects API)
    const enhancedProjects = projects.map((project) => {
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
    
    return NextResponse.json(enhancedProjects);
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user projects' },
      { status: 500 }
    );
  }
} 