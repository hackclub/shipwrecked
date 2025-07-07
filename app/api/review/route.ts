import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { opts } from '../auth/[...nextauth]/route';

// GET all projects that are in review (from all users)
export async function GET(request: NextRequest) {
  try {
    // Check for valid session - user must be logged in but doesn't need to be the project owner
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';

    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin or Reviewer role' }, { status: 403 });
    }

    console.log('Fetching projects in review...');

    // Fetch all projects that have in_review=true
    // Fixed the query to avoid using both include and select for the same relation
    const projectsInReview = await prisma.project.findMany({
      where: {
        in_review: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            hackatimeId: true,
            status: true,
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        hackatimeLinks: true,
      },
    });

    console.log(`Found ${projectsInReview.length} projects in review`);

    // Get unique user IDs to fetch their approved hours
    const userIds = [...new Set(projectsInReview.map((project: any) => project.userId))];

    // Fetch all projects for these users to calculate their approved hours
    const userProjectsMap: Record<string, number> = {};

    for (const userId of userIds) {
      try {
        const userProjects = await prisma.project.findMany({
          where: { userId },
          include: { hackatimeLinks: true }
        });

        // Calculate approved hours using the same logic as project-client.ts
        let approvedHours = 0;
        const projectsWithHours = userProjects
          .map(project => {
            const hours = project.hackatimeLinks.reduce((sum, link) => {
              const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
                ? link.hoursOverride
                : (typeof link.rawHours === 'number' ? link.rawHours : 0);
              return sum + effectiveHours;
            }, 0);
            return { project, hours };
          })
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 4); // Top 4 projects only

        projectsWithHours.forEach(({ project, hours }) => {
          const cappedHours = Math.min(hours, 15);
          const hasApprovedHours = project.hackatimeLinks.some(link =>
            link.hoursOverride !== undefined && link.hoursOverride !== null
          );

          if ((project.viral === true || project.shipped === true) && hasApprovedHours) {
            approvedHours += cappedHours;
          } else if (!project.shipped && !project.viral) {
            approvedHours += Math.min(cappedHours, 14.75);
          }
        });

        userProjectsMap[userId] = Math.min(approvedHours, 60);
      } catch (error) {
        console.error(`Error calculating approved hours for user ${userId}:`, error);
        userProjectsMap[userId] = 0;
      }
    }

    // Format the response to include user's name and the latest review if any
    const formattedProjects = (projectsInReview || []).map((project: any) => {
      const latestReview = project.reviews.length > 0 ? project.reviews[0] : null;

      // Calculate raw hours from hackatime links
      const rawHours = project.hackatimeLinks.reduce(
        (sum: number, link: any) => sum + (typeof link.rawHours === 'number' ? link.rawHours : 0),
        0
      );

      return {
        ...project,
        userName: project.user?.name || null,
        userEmail: project.user?.email || null,
        userImage: project.user?.image || null,
        userHackatimeId: project.user?.hackatimeId || null,
        latestReview,
        reviewCount: project.reviews?.length || 0,
        rawHours: rawHours,
        ownerApprovedHours: userProjectsMap[project.userId] || 0,
      };
    });

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects in review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects in review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 