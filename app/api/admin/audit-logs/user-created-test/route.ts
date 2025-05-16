import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { AuditLogEventType } from '@/lib/auditLogger';

export async function GET(request: NextRequest) {
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
    // Check if we have any UserCreated events
    const userCreatedLogs = await prisma.auditLog.findMany({
      where: {
        eventType: AuditLogEventType.UserCreated
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get general audit log stats
    const auditLogCounts = await prisma.auditLog.groupBy({
      by: ['eventType'],
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      userCreatedLogs,
      auditLogCounts,
      message: userCreatedLogs.length > 0 
        ? `Found ${userCreatedLogs.length} user creation logs` 
        : 'No user creation logs found yet. New user signups will appear here.'
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 