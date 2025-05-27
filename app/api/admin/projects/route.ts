import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    
    // Base query conditions
    let whereCondition: any = {};
    
    // Apply filters if provided
    if (filter === 'in_review') {
      whereCondition.in_review = true;
    } else if (filter === 'shipped') {
      whereCondition.shipped = true;
    } else if (filter === 'viral') {
      whereCondition.viral = true;
    }
    
    // Fetch all projects with user info, reviews, and hackatime links
    const projects = await prisma.project.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reviews: {
          select: {
            id: true,
          },
        },
        hackatimeLinks: true
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    // Process projects to include calculated rawHours
    const processedProjects = projects.map(project => {
      // Calculate total raw hours from all hackatime links, respecting overrides
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
      
      // Return project with calculated rawHours
      return {
        ...project,
        rawHours
      };
    });

    return NextResponse.json(processedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
} 