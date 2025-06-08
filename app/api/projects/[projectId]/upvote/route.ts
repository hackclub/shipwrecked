import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Check for valid session - user must be logged in
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;

    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: {
        projectID: projectId,
      },
      select: {
        projectID: true,
        userId: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Prevent users from upvoting their own projects
    if (project.userId === userId) {
      return NextResponse.json({ error: 'You cannot upvote your own project' }, { status: 400 });
    }

    // Check if user has already upvoted this project
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_projectID: {
          userId: userId,
          projectID: projectId,
        },
      },
    });

    let upvoted = false;
    let upvoteCount = 0;

    if (existingUpvote) {
      // User has already upvoted, remove the upvote (downvote)
      await prisma.upvote.delete({
        where: {
          id: existingUpvote.id,
        },
      });
      upvoted = false;
    } else {
      // User hasn't upvoted, create a new upvote
      await prisma.upvote.create({
        data: {
          userId: userId,
          projectID: projectId,
        },
      });
      upvoted = true;
    }

    // Get the current upvote count for this project
    upvoteCount = await prisma.upvote.count({
      where: {
        projectID: projectId,
      },
    });

    return NextResponse.json({
      success: true,
      upvoted: upvoted,
      upvoteCount: upvoteCount,
    });
  } catch (error) {
    console.error('Error handling upvote:', error);
    return NextResponse.json({ error: 'Failed to process upvote' }, { status: 500 });
  }
} 