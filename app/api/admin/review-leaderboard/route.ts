import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
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

  // Get timeframe from query params
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'all_time';

  try {
    // Calculate date filters based on timeframe
    let dateFilter: Date | undefined;
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'this_week':
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = startOfWeek;
        break;
      case 'all_time':
      default:
        dateFilter = undefined;
        break;
    }

    // Build the where clause for filtering reviews
    const whereClause = dateFilter ? {
      createdAt: {
        gte: dateFilter
      }
    } : {};

    // Get all reviews with project author info to filter out self-reviews
    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            userId: true
          }
        }
      }
    });

    // Filter out self-reviews (where reviewer is the project author)
    const validReviews = reviews.filter(review => review.reviewerId !== review.project.userId);
    
    // Group by reviewerId and count
    const reviewCountMap = new Map<string, number>();
    validReviews.forEach(review => {
      const count = reviewCountMap.get(review.reviewerId) || 0;
      reviewCountMap.set(review.reviewerId, count + 1);
    });

    // Convert to array and sort by count
    const reviewStats = Array.from(reviewCountMap.entries())
      .map(([reviewerId, count]) => ({
        reviewerId,
        _count: { id: count }
      }))
      .sort((a, b) => b._count.id - a._count.id);

    // Get user details for the reviewers
    const reviewerIds = reviewStats.map(stat => stat.reviewerId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: reviewerIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    // Create a map for easy lookup
    const userMap = new Map(users.map(user => [user.id, user]));

    // Combine the data
    const leaderboard = reviewStats.map((stat, index) => {
      const user = userMap.get(stat.reviewerId);
      return {
        rank: index + 1,
        userId: stat.reviewerId,
        name: user?.name || 'Unknown User',
        email: user?.email || 'Unknown Email',
        image: user?.image || null,
        reviewCount: stat._count.id
      };
    }).filter(entry => entry.reviewCount > 0); // Only show users with reviews

    return NextResponse.json({
      timeframe,
      leaderboard,
      totalReviewers: leaderboard.length,
      totalReviews: reviewStats.reduce((sum, stat) => sum + stat._count.id, 0)
    });

  } catch (error) {
    console.error('Error fetching review leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review leaderboard data' },
      { status: 500 }
    );
  }
} 