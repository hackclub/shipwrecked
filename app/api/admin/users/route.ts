import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';
import { getUserClusterAnalysis } from '@/lib/userClustering';

export async function GET() {
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
    // Fetch all users with basic info
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        isAdmin: true,
        role: true,
        status: true,
        hackatimeId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get user cluster analysis to determine user categories
    let userCategories: Record<string, any> = {};
    try {
      const clusterAnalysis = await getUserClusterAnalysis();
      
      // Create a map of user ID to category
      clusterAnalysis.clusters.whales.users.forEach(userId => {
        userCategories[userId] = { category: 'whale', description: 'High-impact creator' };
      });
      clusterAnalysis.clusters.shippers.users.forEach(userId => {
        userCategories[userId] = { category: 'shipper', description: 'Active contributor' };
      });
      clusterAnalysis.clusters.newbies.users.forEach(userId => {
        userCategories[userId] = { category: 'newbie', description: 'Getting started' };
      });
    } catch (clusterError) {
      console.warn('Failed to fetch user cluster analysis:', clusterError);
      // Continue without categories if clustering fails
    }

    // Add category information to users
    const usersWithCategories = users.map(user => ({
      ...user,
      category: userCategories[user.id] || null
    }));

    return NextResponse.json(usersWithCategories);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 