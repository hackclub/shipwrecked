import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logUserEvent, AuditLogEventType } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const { password } = await request.json();
    
    // Check if the password is provided
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
    // Get the super admin password from environment variables
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
    
    // Validate that the environment variable is set
    if (!superAdminPassword) {
      console.error('SUPERADMIN_PASSWORD environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Check if the password matches
    if (password !== superAdminPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }
    
    // Get the user ID
    const userId = session.user.id;
    
    // Update the user to admin role in the database
    await prisma.user.update({
      where: { 
        email: session.user.email as string 
      },
      data: {
        role: 'Admin',
        isAdmin: true,
      },
    });
    
    // Log the role change event
    await logUserEvent({
      eventType: AuditLogEventType.UserRoleChanged,
      description: `User granted Admin role through superadmin authentication`,
      targetUserId: userId,
      actorUserId: userId, // Self-promotion via superadmin
      metadata: {
        oldRole: session.user.role || 'User',
        newRole: 'Admin',
        method: 'superadmin'
      }
    });
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Admin privileges granted successfully'
    });
  } catch (error) {
    console.error('Error in superadmin authentication:', error);
    return NextResponse.json({ 
      error: 'Failed to process authentication' 
    }, { status: 500 });
  }
} 