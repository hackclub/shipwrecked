import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../../../auth/[...nextauth]/route';
import { withRateLimit } from '@/lib/rateLimit';

// GET - Get chat messages for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    
    // Get optional 'since' timestamp from query parameters
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    const sinceTimestamp = sinceParam ? new Date(sinceParam) : null;

    // Check if the project exists and has chat enabled
    const project = await prisma.project.findUnique({
      where: {
        projectID: projectId,
      },
      select: {
        chat_enabled: true,
        userId: true, // Include userId to determine author
        projectTags: {
          select: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.chat_enabled) {
      return NextResponse.json({ error: 'Chat is not enabled for this project' }, { status: 403 });
    }

    // Check if this is an island project
    const isIslandProject = project.projectTags.some(pt => pt.tag.name === 'island-project');

    // Get the chat room for this project
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        projectID: projectId,
      },
    });

    if (!chatRoom) {
      // No chat room yet, return empty array
      return NextResponse.json([]);
    }

    // Build the where clause for messages
    const whereClause: any = {
      roomId: chatRoom.id,
    };

    // If a since timestamp is provided, only get messages newer than that
    if (sinceTimestamp && !isNaN(sinceTimestamp.getTime())) {
      whereClause.createdAt = {
        gt: sinceTimestamp,
      };
    }

    // Get messages from the chat room
    const messageQueryOptions: any = {
      where: whereClause,
      orderBy: {
        createdAt: sinceTimestamp ? 'asc' : 'desc', // If since timestamp, get oldest first; otherwise newest first
      },
      take: sinceTimestamp ? undefined : 100, // If since timestamp, get all new messages; otherwise limit to 100
    };

    // Only add include clause for island projects
    if (isIslandProject) {
      messageQueryOptions.include = {
        user: {
          select: {
            name: true
          }
        }
      };
    }

    const messages = await prisma.chatMessage.findMany(messageQueryOptions);

    // If no since timestamp, reverse to get chronological order (oldest to newest) for display
    const chronologicalMessages = sinceTimestamp ? messages : messages.reverse();

    // Format messages for the client - include isAuthor flag and user name for island projects
    const formattedMessages = chronologicalMessages.map(message => ({
      id: message.id,
      content: message.content,
      userId: message.userId,
      createdAt: message.createdAt.toISOString(),
      isAuthor: message.userId === project.userId, // Flag to indicate if message is from project author
      userName: isIslandProject && (message as any).user ? (message as any).user.name : undefined, // Include real name for island projects
    }));

    return NextResponse.json(formattedMessages);

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a new chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(opts);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await params;
  const userId = session.user.id;

  // Apply rate limiting: 1 message every 5 seconds per user per project
  return withRateLimit(
    {
      window: 5, // 5 seconds
      maxRequests: 1, // 1 message max
      keyPrefix: `chat_message:${userId}:${projectId}` // Per user per project
    },
    async () => {
      try {
        const body = await request.json();

        if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
          return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        // Limit message length to 1000 characters
        if (body.content.trim().length > 1000) {
          return NextResponse.json({ error: 'Message too long. Maximum 1000 characters allowed.' }, { status: 400 });
        }

        // Check if the project exists and has chat enabled
        const project = await prisma.project.findUnique({
          where: {
            projectID: projectId,
          },
          select: {
            chat_enabled: true,
            userId: true, // Include userId to determine author
            projectTags: {
              select: {
                tag: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.chat_enabled) {
          return NextResponse.json({ error: 'Chat is not enabled for this project' }, { status: 403 });
        }

        // Check if this is an island project
        const isIslandProject = project.projectTags.some(pt => pt.tag.name === 'island-project');

        // For island projects, only the project owner may post messages
        if (isIslandProject && session.user.id !== project.userId) {
          return NextResponse.json({ error: 'Only the project owner can write in island stories.' }, { status: 403 });
        }

        // Get or create the chat room for this project
        let chatRoom = await prisma.chatRoom.findFirst({
          where: {
            projectID: projectId,
          },
        });

        if (!chatRoom) {
          // Create a chat room if it doesn't exist
          chatRoom = await prisma.chatRoom.create({
            data: {
              projectID: projectId,
              name: 'General Discussion',
            }
          });
        }

        // Create the message
        const messageCreateOptions: any = {
          data: {
            content: body.content.trim(),
            userId: session.user.id,
            roomId: chatRoom.id,
          }
        };

        // Only add include clause for island projects
        if (isIslandProject) {
          messageCreateOptions.include = {
            user: {
              select: {
                name: true
              }
            }
          };
        }

        const message = await prisma.chatMessage.create(messageCreateOptions);

        // Format message for the client
        const formattedMessage = {
          id: message.id,
          content: message.content,
          userId: message.userId,
          createdAt: message.createdAt.toISOString(),
          isAuthor: message.userId === project.userId, // Flag to indicate if message is from project author
          userName: isIslandProject && (message as any).user ? (message as any).user.name : undefined, // Include real name for island projects
        };

        return NextResponse.json(formattedMessage);

      } catch (error) {
        console.error('Error sending chat message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
      }
    }
  );
} 