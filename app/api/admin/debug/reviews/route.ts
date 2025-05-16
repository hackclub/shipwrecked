import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

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
    // Get database statistics
    const reviewCount = await prisma.review.count();
    const projectCount = await prisma.project.count();
    const projectInReviewCount = await prisma.project.count({
      where: { in_review: true }
    });
    const auditLogCount = await prisma.auditLog.count();
    
    // Fetch 5 latest reviews
    const latestReviews = await prisma.review.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            projectID: true,
            name: true
          }
        }
      }
    });
    
    // Fetch projects in review with their reviews
    const projectsInReview = await prisma.project.findMany({
      where: { in_review: true },
      take: 5,
      include: {
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json({
      stats: {
        reviewCount,
        projectCount,
        projectInReviewCount,
        auditLogCount
      },
      latestReviews,
      projectsInReview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 