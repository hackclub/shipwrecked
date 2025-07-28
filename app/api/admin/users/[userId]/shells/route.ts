import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { logShellModification } from '@/lib/auditLogger';
import { calculateProgressMetrics } from '@/lib/project-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Await params before using
  const { userId } = await params;
  
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== 'Admin' && !session.user.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { adjustment, reason } = await request.json();

    // Validate adjustment value
    if (typeof adjustment !== 'number' || adjustment === 0) {
      return NextResponse.json(
        { error: 'Invalid adjustment value. Must be a non-zero number.' },
        { status: 400 }
      );
    }

    // Validate adjustment is within reasonable bounds (-1000 to 1000 shells)
    if (Math.abs(adjustment) > 1000) {
      return NextResponse.json(
        { error: 'Adjustment too large. Maximum adjustment is ±1000 shells.' },
        { status: 400 }
      );
    }

    // Validate reason (optional but should be string if provided)
    if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Reason must be a non-empty string if provided.' },
        { status: 400 }
      );
    }

    // Get the target user with all necessary data for shell calculation
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          include: {
            hackatimeLinks: true
          }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate current shell balance using the enhanced function
    const currentMetrics = calculateProgressMetrics(
      targetUser.projects,
      targetUser.purchasedProgressHours,
      targetUser.totalShellsSpent,
      targetUser.adminShellAdjustment
    );

    // Update the user's admin shell adjustment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        adminShellAdjustment: {
          increment: adjustment
        }
      }
    });

    // Calculate new shell balance
    const newMetrics = calculateProgressMetrics(
      targetUser.projects,
      targetUser.purchasedProgressHours,
      updatedUser.totalShellsSpent,
      updatedUser.adminShellAdjustment
    );

    // Log the shell modification
    await logShellModification({
      targetUserId: userId,
      actorUserId: session.user.id!,
      adjustment,
      reason: reason?.trim(),
      previousBalance: currentMetrics.availableShells,
      newBalance: newMetrics.availableShells
    });

    return NextResponse.json({
      success: true,
      previousBalance: currentMetrics.availableShells,
      newBalance: newMetrics.availableShells,
      adjustment,
      adminShellAdjustment: updatedUser.adminShellAdjustment,
      shellBreakdown: {
        availableShells: newMetrics.availableShells
      }
    });

  } catch (error) {
    console.error('Error modifying user shells:', error);
    return NextResponse.json(
      { error: 'Failed to modify user shells' },
      { status: 500 }
    );
  }
} 