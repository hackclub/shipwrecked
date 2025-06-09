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
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.chat_enabled) {
      return NextResponse.json({ error: 'Chat is not enabled for this project' }, { status: 403 });
    }

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
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: {
        createdAt: sinceTimestamp ? 'asc' : 'desc', // If since timestamp, get oldest first; otherwise newest first
      },
      take: sinceTimestamp ? undefined : 100, // If since timestamp, get all new messages; otherwise limit to 100
    });

    // If no since timestamp, reverse to get chronological order (oldest to newest) for display
    const chronologicalMessages = sinceTimestamp ? messages : messages.reverse();

    // Format messages for the client - only include userId, no real user data
    const formattedMessages = chronologicalMessages.map(message => ({
      id: message.id,
      content: message.content,
      userId: message.userId,
      createdAt: message.createdAt.toISOString(),
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
          }
        });

        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.chat_enabled) {
          return NextResponse.json({ error: 'Chat is not enabled for this project' }, { status: 403 });
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
        const message = await prisma.chatMessage.create({
          data: {
            content: body.content.trim(),
            userId: session.user.id,
            roomId: chatRoom.id,
          },
        });

        // Format message for the client
        const formattedMessage = {
          id: message.id,
          content: message.content,
          userId: message.userId,
          createdAt: message.createdAt.toISOString(),
        };

        return NextResponse.json(formattedMessage);

      } catch (error) {
        console.error('Error sending chat message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
      }
    }
  );
} 