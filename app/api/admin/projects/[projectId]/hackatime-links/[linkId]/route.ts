import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';
import { removeHackatimeProjectLink } from '@/lib/hackatime-links';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string, linkId: string }> }
) {
  const { projectId, linkId } = await params;
  
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check for admin role or isAdmin flag
  const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    // Get the link to record details for the audit log
    const linkToRemove = await prisma.hackatimeProjectLink.findUnique({
      where: { id: linkId },
      include: {
        project: {
          include: { user: true }
        }
      }
    });

    if (!linkToRemove) {
      return NextResponse.json({ error: 'Hackatime link not found' }, { status: 404 });
    }

    // Verify the link belongs to the specified project
    if (linkToRemove.projectID !== projectId) {
      return NextResponse.json({ error: 'Hackatime link does not belong to this project' }, { status: 400 });
    }

    // Create audit log entry before deleting the link
    await logProjectEvent({
      eventType: AuditLogEventType.OtherEvent,
      description: `Hackatime link "${linkToRemove.hackatimeName}" was removed from project "${linkToRemove.project.name}" by admin`,
      projectId: projectId,
      userId: linkToRemove.project.userId,
      actorUserId: session.user.id,
      metadata: {
        action: 'remove_hackatime_link',
        linkDetails: {
          id: linkToRemove.id,
          hackatimeName: linkToRemove.hackatimeName,
          rawHours: linkToRemove.rawHours,
          hoursOverride: linkToRemove.hoursOverride || null,
          projectName: linkToRemove.project.name,
          projectOwnerEmail: linkToRemove.project.user?.email
        }
      }
    });

    // Delete the Hackatime project link using the helper function
    await removeHackatimeProjectLink(projectId, linkId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing Hackatime link:', error);
    return NextResponse.json({ error: 'Failed to remove Hackatime link' }, { status: 500 });
  }
} 