import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { createAuditLog, AuditLogEventType, logUserEvent, logProjectEvent } from '@/lib/auditLogger';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get a user for testing
    const userId = session.user.id;
    console.log('Test audit log route called with user ID:', userId);
    
    // Create a test audit log entry
    const result = await logUserEvent({
      eventType: AuditLogEventType.OtherEvent,
      description: 'Test audit log entry',
      targetUserId: userId,
      actorUserId: userId,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    
    // Fetch latest audit logs to verify
    const logs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: !!result,
      testResult: result,
      recentLogs: logs,
      message: result ? 'Test audit log created successfully' : 'Failed to create test audit log'
    });
  } catch (error) {
    console.error('Error in test audit log endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// New test endpoint specifically for testing ProjectDeleted events
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    console.log('Testing ProjectDeleted audit log with user ID:', userId);
    
    // Get the first project of the user (if exists)
    const userProject = await prisma.project.findFirst({
      where: { userId },
      select: { projectID: true, name: true }
    });
    
    if (!userProject) {
      return NextResponse.json({
        success: false,
        error: 'No projects found for user to test with'
      }, { status: 404 });
    }
    
    // Log a fake project deletion event for testing
    console.log(`Creating test ProjectDeleted audit log for project ${userProject.projectID}`);
    const result = await logProjectEvent({
      eventType: AuditLogEventType.ProjectDeleted,
      description: `TEST: Project "${userProject.name}" was deleted (Hackatime: test-hackatime)`,
      projectId: userProject.projectID,
      userId: userId,
      actorUserId: userId,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        projectDetails: {
          projectID: userProject.projectID,
          name: userProject.name,
          hackatime: 'test-hackatime'
        }
      }
    });
    
    return NextResponse.json({
      success: !!result,
      testResult: result,
      message: result ? 'Test ProjectDeleted audit log created successfully' : 'Failed to create test ProjectDeleted audit log'
    });
  } catch (error) {
    console.error('Error in test ProjectDeleted audit log endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 