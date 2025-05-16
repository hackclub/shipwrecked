import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';

// POST - Mark a project review as complete
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
    
    // Get the project to verify it exists
    const project = await prisma.project.findUnique({
      where: {
        projectID: body.projectID,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // If the project is not in review, there's nothing to do
    if (!project.in_review) {
      return NextResponse.json({ error: 'Project is not in review' }, { status: 400 });
    }

    // If approved status is provided, set it
    const updateData: any = {
      in_review: false
    };
    if (typeof body.hoursOverride === 'number') {
      updateData.hoursOverride = body.hoursOverride;
    }
    if (typeof body.rawHours === 'number') {
      updateData.rawHours = body.rawHours;
    }

    // Mark the project as no longer in review
    const updatedProject = await prisma.project.update({
      where: {
        projectID: body.projectID,
      },
      data: updateData,
    });

    // Add a review comment if one was provided
    let review = null;
    if (body.comment) {
      review = await prisma.review.create({
        data: {
          comment: `✅ Review Completed: ${body.comment}`,
          projectID: body.projectID,
          reviewerId: session.user.id,
        },
      });
    }

    return NextResponse.json({ 
      project: updatedProject,
      review
    });
  } catch (error) {
    console.error('Error completing project review:', error);
    return NextResponse.json({ error: 'Failed to complete project review' }, { status: 500 });
  }
} 