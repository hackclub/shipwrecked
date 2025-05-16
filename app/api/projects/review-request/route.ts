import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';
import type { ReviewRequestType } from '@/components/common/ProjectReviewRequest';
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';

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

    if (!body.reviewType) {
      return NextResponse.json({ error: 'Review type is required' }, { status: 400 });
    }

    // Validate reviewType
    const validReviewTypes = ['ShippedApproval', 'ViralApproval', 'HoursApproval', 'Other'];
    if (!validReviewTypes.includes(body.reviewType)) {
      return NextResponse.json({ error: 'Invalid review type' }, { status: 400 });
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

    // Format the review comment based on the review type
    const reviewTypeLabels: Record<string, string> = {
      ShippedApproval: '🚢 Shipped Approval',
      ViralApproval: '🔥 Viral Approval',
      HoursApproval: '⏱️ Hours Approval',
      Other: '❓ Other Request'
    };

    // Create the review record
    const review = await prisma.review.create({
      data: {
        projectID: body.projectID,
        reviewerId: session.user.id,
        comment: body.comment,
        reviewType: body.reviewType,
      },
    });

    // Log the audit event
    await logProjectEvent({
      eventType: AuditLogEventType.ProjectSubmittedForReview,
      description: `Project submitted for review with request type: ${reviewTypeLabels[body.reviewType] || 'Unknown'}`,
      projectId: body.projectID,
      userId: session.user.id,
      actorUserId: session.user.id,
      metadata: {
        reviewType: body.reviewType,
        reviewId: review.id
      }
    });

    return NextResponse.json({
      success: true,
      review,
      project: updatedProject
    });
  } catch (error) {
    console.error('Error submitting project for review:', error);
    return NextResponse.json({ error: 'Failed to submit project for review' }, { status: 500 });
  }
} 