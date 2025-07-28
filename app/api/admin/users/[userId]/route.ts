import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { UserStatus } from '@/app/generated/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
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
    const { userId } = await params;
    
    // Fetch the specific user with their projects and tags
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        hackatimeId: true,
        slack: true,
        purchasedProgressHours: true,
        totalShellsSpent: true,
        adminShellAdjustment: true,
        projects: {
          include: {
            hackatimeLinks: true,
            reviews: {
              select: {
                id: true
              }
            }
          }
        },
        userTags: {
          include: {
            tag: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Enhance the project data with computed properties
    const enhancedProjects = user.projects.map((project) => {
      // Get the main Hackatime name (for backwards compatibility)
      const hackatimeName = project.hackatimeLinks.length > 0 
        ? project.hackatimeLinks[0].hackatimeName 
        : '';
      
      // Calculate total raw hours from all links, applying individual overrides when available
      const rawHours = project.hackatimeLinks.reduce(
        (sum, link) => {
          // Use the link's hoursOverride if it exists, otherwise use rawHours
          const effectiveHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
            ? link.hoursOverride
            : (typeof link.rawHours === 'number' ? link.rawHours : 0);
          
          return sum + effectiveHours;
        }, 
        0
      );
      
      // Return the enhanced project with additional properties
      return {
        ...project,
        hackatimeName,
        rawHours,
        reviewCount: project.reviews.length
      };
    });

    return NextResponse.json({
      ...user,
      projects: enhancedProjects
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
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
    const { userId } = await params;
    const data = await request.json();
    
    // Only allow updating specific fields for security
    const { role, status } = data;
    
    // Check if this is a downgrade from Admin
    const userBeforeUpdate = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isAdmin: true },
    });
    
    const isDowngrade = 
      (userBeforeUpdate?.role === 'Admin' && role && role !== 'Admin') || 
      (userBeforeUpdate?.isAdmin === true && data.isAdmin === false);
      
    // Update the user
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: role || undefined,
        status: status ? status as UserStatus : undefined,
        // If isAdmin is explicitly set in the request, update it
        ...(data.isAdmin !== undefined ? { isAdmin: data.isAdmin } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        status: true,
        createdAt: true,
        hackatimeId: true,
        slack: true,
      },
    });
    
    // If this was a downgrade from Admin role, invalidate any active sessions for this user
    if (isDowngrade) {
      // Delete the sessions for this user to force them to log in again with new permissions
      await prisma.session.deleteMany({
        where: { userId: userId }
      });
      
      console.log(`User ${userId} was downgraded from Admin. All sessions invalidated.`);
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
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
    const userId = params.userId;
    
    // Delete the user
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 