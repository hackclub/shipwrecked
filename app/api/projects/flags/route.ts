import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';

// PATCH - Update project flags (shipped, viral, approved)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(opts);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate projectID is provided
    if (!body.projectID) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check which flags are being updated
    const updateData: any = {};
    
    if (typeof body.shipped === 'boolean') updateData.shipped = body.shipped;
    if (typeof body.viral === 'boolean') updateData.viral = body.viral;
    if (typeof body.in_review === 'boolean') updateData.in_review = body.in_review;
    if (typeof body.hoursOverride === 'number') updateData.hoursOverride = body.hoursOverride;
    if (typeof body.rawHours === 'number') updateData.rawHours = body.rawHours;

    // If no valid flags provided
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
    }

    // Get the current project state for comparison and owner info
    const currentProject = await prisma.project.findUnique({
      where: {
        projectID: body.projectID,
      },
      include: {
        user: {
          select: {
            id: true,
          }
        }
      }
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: {
        projectID: body.projectID,
      },
      data: updateData,
    });

    // Log appropriate audit events based on what changed
    const actorId = session.user.id;
    const targetUserId = currentProject.userId;
    
    // Create audit logs for significant status changes
    if (typeof body.shipped === 'boolean' && body.shipped !== currentProject.shipped && body.shipped === true) {
      await logProjectEvent({
        eventType: AuditLogEventType.ProjectMarkedShipped,
        description: `Project "${currentProject.name}" was marked as shipped`,
        projectId: body.projectID,
        userId: targetUserId,
        actorUserId: actorId,
        metadata: {
          previousState: { shipped: currentProject.shipped },
          newState: { shipped: true }
        }
      });
    }
    
    if (typeof body.viral === 'boolean' && body.viral !== currentProject.viral && body.viral === true) {
      await logProjectEvent({
        eventType: AuditLogEventType.ProjectMarkedViral,
        description: `Project "${currentProject.name}" was marked as viral`,
        projectId: body.projectID,
        userId: targetUserId,
        actorUserId: actorId,
        metadata: {
          previousState: { viral: currentProject.viral },
          newState: { viral: true }
        }
      });
    }
    
    if (typeof body.in_review === 'boolean' && body.in_review !== currentProject.in_review && body.in_review === false) {
      await logProjectEvent({
        eventType: AuditLogEventType.ProjectReviewCompleted,
        description: `Review was completed for project "${currentProject.name}"`,
        projectId: body.projectID,
        userId: targetUserId,
        actorUserId: actorId,
        metadata: {
          shipped: updatedProject.shipped,
          viral: updatedProject.viral
        }
      });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project flags:', error);
    return NextResponse.json({ error: 'Failed to update project flags' }, { status: 500 });
  }
} 