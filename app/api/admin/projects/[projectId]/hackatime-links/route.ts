import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';
import { addHackatimeProjectLink, getHackatimeProjectLinks } from '@/lib/hackatime-links';

// POST - Add a new Hackatime project link (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  
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
    // Get request body
    const { hackatimeName } = await request.json();
    
    if (!hackatimeName) {
      return NextResponse.json(
        { error: 'Hackatime project name is required' },
        { status: 400 }
      );
    }
    
    // Reject attempts to link <<LAST_PROJECT>>
    if (hackatimeName === '<<LAST_PROJECT>>') {
      return NextResponse.json(
        { error: 'The project "<<LAST_PROJECT>>" cannot be linked' },
        { status: 400 }
      );
    }
    
    // Get the project to record owner details for the audit log
    const project = await prisma.project.findUnique({
      where: { projectID: projectId },
      include: { user: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // IMPORTANT: Use the project owner's userId, not the admin's
    const projectOwnerId = project.userId;
    
    // Add the link - this will use the project owner's Hackatime account
    const link = await addHackatimeProjectLink(projectId, hackatimeName);

    // Create audit log entry for the addition
    await logProjectEvent({
      eventType: AuditLogEventType.OtherEvent,
      description: `Hackatime link "${hackatimeName}" was added to project "${project.name}" by admin`,
      projectId: projectId,
      userId: projectOwnerId, // Project owner
      actorUserId: session.user.id, // Admin who made the change
      metadata: {
        action: 'add_hackatime_link',
        linkDetails: {
          id: link.id,
          hackatimeName: link.hackatimeName,
          rawHours: link.rawHours,
          projectName: project.name,
          projectOwnerEmail: project.user?.email
        }
      }
    });

    // Get all updated links for this project
    const updatedLinks = await getHackatimeProjectLinks(projectId);

    return NextResponse.json({
      success: true,
      link,
      allLinks: updatedLinks
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding Hackatime link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to add Hackatime link: ${errorMessage}` 
    }, { status: 500 });
  }
}

// GET - Retrieve all Hackatime project links for a project (admin only)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  
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
    // Get all links for this project
    const links = await getHackatimeProjectLinks(projectId);
    
    // Get the project to include user details
    const project = await prisma.project.findUnique({
      where: { projectID: projectId },
      select: { 
        name: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hackatimeId: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      project,
      links
    });
  } catch (error) {
    console.error('Error getting Hackatime project links:', error);
    return NextResponse.json(
      { error: 'Failed to get Hackatime project links' },
      { status: 500 }
    );
  }
} 