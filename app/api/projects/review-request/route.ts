import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';

// POST - Submit a project for review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.projectID) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!body.comment) {
      return NextResponse.json({ error: 'Review comment is required' }, { status: 400 });
    }

    // Get the project to verify it exists and belongs to the user
    const project = await prisma.project.findUnique({
      where: {
        projectID: body.projectID,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Mark the project as in review
    const updatedProject = await prisma.project.update({
      where: {
        projectID: body.projectID,
      },
      data: {
        in_review: true,
      },
    });

    // Add a review comment
    const review = await prisma.review.create({
      data: {
        comment: `📝 Review Request: ${body.comment}`,
        projectID: body.projectID,
        reviewerId: session.user.id,
      },
    });

    return NextResponse.json({ 
      project: updatedProject,
      review
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting project for review:', error);
    return NextResponse.json({ error: 'Failed to submit project for review' }, { status: 500 });
  }
} 