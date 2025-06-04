import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

interface RouteParams {
  params: {
    projectID: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Check for valid session
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectID } = params;
    const userId = session.user.id;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { projectID },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has already upvoted this project
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_projectID: {
          userId,
          projectID,
        },
      },
    });

    if (existingUpvote) {
      // Remove upvote if it exists
      await prisma.upvote.delete({
        where: {
          id: existingUpvote.id,
        },
      });

      // Get updated count
      const upvoteCount = await prisma.upvote.count({
        where: { projectID },
      });

      return NextResponse.json({
        success: true,
        upvoted: false,
        upvoteCount,
      });
    } else {
      // Add upvote if it doesn't exist
      await prisma.upvote.create({
        data: {
          userId,
          projectID,
        },
      });

      // Get updated count
      const upvoteCount = await prisma.upvote.count({
        where: { projectID },
      });

      return NextResponse.json({
        success: true,
        upvoted: true,
        upvoteCount,
      });
    }
  } catch (error) {
    console.error('Error handling upvote:', error);
    return NextResponse.json({ error: 'Failed to handle upvote' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Check for valid session
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectID } = params;
    const userId = session.user.id;

    // Check if user has upvoted this project
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_projectID: {
          userId,
          projectID,
        },
      },
    });

    // Get total upvote count for this project
    const upvoteCount = await prisma.upvote.count({
      where: { projectID },
    });

    return NextResponse.json({
      upvoted: !!existingUpvote,
      upvoteCount,
    });
  } catch (error) {
    console.error('Error fetching upvote status:', error);
    return NextResponse.json({ error: 'Failed to fetch upvote status' }, { status: 500 });
  }
} 