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

    const userId = session.user.id;

    console.log('Fetching all projects for gallery...');
    
    // Fetch all projects from all users with user info, hackatime links, and upvote data
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
        hasRepoBadge: true,
        chat_enabled: true,
        userId: true,
        hackatimeLinks: true,
        user: {
          select: {
            name: true,
            slack: true,
            image: true
          }
        },
        _count: {
          select: {
            upvotes: true,
            chatRooms: {
              where: {
                messages: {
                  some: {}
                }
              }
            }
          },
        },
        chatRooms: {
          select: {
            _count: {
              select: {
                messages: true
              }
            },
            messages: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1,
              select: {
                createdAt: true
              }
            }
          }
        },
      },
    });

    // Get current user's upvotes in a separate query for privacy
    const userUpvotes = await prisma.upvote.findMany({
      where: {
        userId: userId,
        projectID: {
          in: allProjects.map(p => p.projectID),
        },
      },
      select: {
        projectID: true,
      },
    });

    // Create a Set for faster lookup
    const userUpvotedProjectIds = new Set(userUpvotes.map(upvote => upvote.projectID));

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

      // Check if current user has upvoted this project
      const userUpvoted = userUpvotedProjectIds.has(project.projectID);
      
      // Calculate total chat message count across all chat rooms for this project
      const chatCount = project.chatRooms.reduce((total, room) => total + room._count.messages, 0);
      
      // Find the most recent chat message timestamp across all rooms
      let lastChatActivity: Date | null = null;
      for (const room of project.chatRooms) {
        if (room.messages.length > 0) {
          const roomLastMessage = room.messages[0].createdAt;
          if (!lastChatActivity || roomLastMessage > lastChatActivity) {
            lastChatActivity = roomLastMessage;
          }
        }
      }
      
      // Return the enhanced project with additional properties
      return {
        ...project,
        hackatimeName,
        rawHours,
        upvoteCount: project._count.upvotes,
        userUpvoted,
        chatCount,
        lastChatActivity: lastChatActivity?.toISOString() || null,
        // Remove the _count and chatRooms objects from the response
        _count: undefined,
        chatRooms: undefined,
      };
    });

    console.log(`Found ${enhancedProjects.length} projects for gallery`);
    return NextResponse.json(enhancedProjects);
  } catch (error) {
    console.error('Error fetching gallery projects:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery projects' }, { status: 500 });
  }
} 