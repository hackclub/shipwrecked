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

    // Check if user is admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';
    
    if (!isAdmin && !isReviewer) {
      console.warn(`Unauthorized flag update attempt by user ${session.user.id}`);
      return NextResponse.json({ error: 'Forbidden: Admin or Reviewer access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate projectID is provided
    if (!body.projectID) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check which flags are being updated
    const updateData: any = {};
    
    // Admin users can update all flags
    if (isAdmin) {
      if (typeof body.shipped === 'boolean') updateData.shipped = body.shipped;
      if (typeof body.viral === 'boolean') updateData.viral = body.viral;
      if (typeof body.in_review === 'boolean') updateData.in_review = body.in_review;
    } 
    // Reviewers can only update in_review status
    else if (isReviewer) {
      if (typeof body.in_review === 'boolean') updateData.in_review = body.in_review;
      
      // Log if reviewer attempts to update other flags
      const attemptedFields = [];
      if (typeof body.shipped === 'boolean') attemptedFields.push('shipped');
      if (typeof body.viral === 'boolean') attemptedFields.push('viral');
      
      if (attemptedFields.length > 0) {
        console.warn(`Reviewer ${session.user.id} attempted to update restricted fields: ${attemptedFields.join(', ')}`);
      }
    }

    // Check for hackatime link overrides
    const hackatimeLinkOverrides = body.hackatimeLinkOverrides;
    const hasLinkOverrides = hackatimeLinkOverrides !== undefined && 
                             typeof hackatimeLinkOverrides === 'object';

    // If no valid flags provided and no link overrides
    if (Object.keys(updateData).length === 0 && !hasLinkOverrides) {
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
        },
        hackatimeLinks: true
      }
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create a transaction to update both project flags and hackatime link overrides
    const updatedProject = await prisma.$transaction(async (prismaClient) => {
      // 1. Update the project
      const updated = await prismaClient.project.update({
        where: {
          projectID: body.projectID,
        },
        data: updateData,
        include: {
          hackatimeLinks: true
        }
      });
      
      // 2. Process Hackatime link overrides if provided (even if empty)
      if (isAdmin && hasLinkOverrides) {
        console.log(`Processing Hackatime link overrides`);
        
        // Get all link IDs from the current project
        const projectLinkIds = currentProject.hackatimeLinks.map(link => link.id);
        
        // Process ALL links for the project to ensure consistency
        for (const linkId of projectLinkIds) {
          // Check if this link ID exists in the overrides object
          const hasOverrideValue = linkId in hackatimeLinkOverrides;
          const overrideValue = hackatimeLinkOverrides[linkId];
          
          // Process ALL links: set if in request, clear if not
          if (hasOverrideValue && typeof overrideValue === 'number' && !isNaN(overrideValue)) {
            // Set a specific override value
            await prismaClient.hackatimeProjectLink.update({
              where: { id: linkId },
              data: { hoursOverride: overrideValue }
            });
            console.log(`Set override to ${overrideValue} for link ${linkId}`);
          } else {
            // Clear the override for links not in request or with invalid values
            await prismaClient.hackatimeProjectLink.update({
              where: { id: linkId },
              data: { hoursOverride: null }
            });
            console.log(`Cleared override for link ${linkId}`);
          }
        }
      }
      
      // Refresh project data with updated links
      return await prismaClient.project.findUnique({
        where: { projectID: body.projectID },
        include: { hackatimeLinks: true }
      });
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
          shipped: updatedProject?.shipped ?? currentProject.shipped,
          viral: updatedProject?.viral ?? currentProject.viral
        }
      });
    }
    
    // Log Hackatime hour overrides
    if (hasLinkOverrides && isAdmin) {
      const linkChanges = Object.entries(hackatimeLinkOverrides).map(([linkId, hours]) => {
        const link = currentProject.hackatimeLinks.find(l => l.id === linkId);
        if (!link) return null;
        
        const previousHours = link.hoursOverride;
        return {
          linkId,
          hackatimeName: link.hackatimeName,
          previousHours: previousHours,
          newHours: hours
        };
      }).filter(Boolean);
      
      if (linkChanges.length > 0) {
        await logProjectEvent({
          eventType: AuditLogEventType.OtherEvent,
          description: `Hours overrides updated for project "${currentProject.name}"`,
          projectId: body.projectID,
          userId: targetUserId,
          actorUserId: actorId,
          metadata: {
            action: "hours_override_update",
            linkChanges
          }
        });
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project flags:', error);
    return NextResponse.json({ error: 'Failed to update project flags' }, { status: 500 });
  }
} 