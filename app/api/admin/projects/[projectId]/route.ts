import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logProjectEvent, AuditLogEventType } from '@/lib/auditLogger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
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
    // Use destructuring to access params properly
    const { projectId } = await params;
    
    // Fetch the specific project with user info, reviews, and hackatime links
    const project = await prisma.project.findUnique({
      where: {
        projectID: projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reviews: {
          select: {
            id: true,
          },
        },
        hackatimeLinks: true
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate total raw hours from all hackatime links
    const rawHours = project.hackatimeLinks.reduce(
      (sum, link) => sum + (typeof link.rawHours === 'number' ? link.rawHours : 0), 
      0
    );
    
    // Return project with calculated rawHours
    const processedProject = {
      ...project,
      rawHours
    };

    return NextResponse.json(processedProject);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
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
    // Use destructuring to access params properly
    const { projectId } = await params;
    
    // Fetch project details before deletion to use in audit log
    const projectToDelete = await prisma.project.findUnique({
      where: {
        projectID: projectId,
      },
      include: {
        user: true, // Include user info to identify the project owner
        hackatimeLinks: true // Include hackatime links
      }
    });
    
    if (!projectToDelete) {
      return NextResponse.json({
        error: 'Project not found',
      }, { status: 404 });
    }
    
    // Create audit log for admin project deletion BEFORE deletion
    console.log(`[ADMIN DELETE] Creating audit log for project deletion: ${projectId}`);
    const auditLogResult = await logProjectEvent({
      eventType: AuditLogEventType.ProjectDeleted,
      description: `Project "${projectToDelete.name}" was deleted by admin`,
      projectId: projectId,
      userId: projectToDelete.userId, // Target user is the project owner
      actorUserId: session.user.id, // Actor is the admin
      metadata: {
        projectDetails: {
          projectID: projectToDelete.projectID,
          name: projectToDelete.name,
          description: projectToDelete.description,
          adminAction: true,
          ownerName: projectToDelete.user?.name,
          ownerEmail: projectToDelete.user?.email
        }
      }
    });
    
    console.log(`[ADMIN DELETE] Audit log creation result: ${auditLogResult ? 'Success' : 'Failed'}`);
    
    // First delete any reviews associated with the project
    await prisma.review.deleteMany({
      where: {
        projectID: projectId,
      },
    });
    
    // Delete hackatime links associated with the project
    await prisma.hackatimeProjectLink.deleteMany({
      where: {
        projectID: projectId,
      },
    });
    
    // Then delete the project
    await prisma.project.delete({
      where: {
        projectID: projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 