import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { createAuditLog, AuditLogEventType } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    
    // Validate required fields
    if (!body.eventType || !body.description || !body.targetUserId) {
      return NextResponse.json({ 
        error: 'Missing required fields: eventType, description, and targetUserId are required' 
      }, { status: 400 });
    }
    
    // Validate event type
    if (!Object.values(AuditLogEventType).includes(body.eventType)) {
      return NextResponse.json({ 
        error: 'Invalid event type', 
        validTypes: Object.values(AuditLogEventType) 
      }, { status: 400 });
    }
    
    // Create the audit log
    const auditLog = await createAuditLog({
      eventType: body.eventType,
      description: body.description,
      targetUserId: body.targetUserId,
      actorUserId: session.user.id, // Current admin is the actor
      projectId: body.projectId, // Optional
      metadata: body.metadata, // Optional
    });
    
    if (!auditLog) {
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      auditLog 
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json({ 
      error: 'Failed to create audit log' 
    }, { status: 500 });
  }
} 