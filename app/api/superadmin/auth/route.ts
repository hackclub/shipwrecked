import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logUserEvent, AuditLogEventType } from '@/lib/auditLogger';
import { withRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Get IP address for rate limiting (using forwarded header or direct IP)
  const ip = request.headers.get('x-forwarded-for') || 'unknown_ip';
  
  // Apply rate limiting with a strict window - only 3 attempts every 5 minutes
  return withRateLimit(
    {
      window: 300, // 5 minutes (in seconds)
      maxRequests: 3,
      keyPrefix: `superadmin_auth:${ip}` // Use IP-specific key to prevent global DOS
    },
    async () => {
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
        
        // Re-fetch the user from the database to verify current state
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, role: true, isAdmin: true }
        });

        if (!currentUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        // Use the freshly fetched user data for the update
        await prisma.user.update({
          where: { id: currentUser.id },
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
  );
} 