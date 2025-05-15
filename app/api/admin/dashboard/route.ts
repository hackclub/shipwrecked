import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  // Check authentication
  const session = await getServerSession(opts);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Count total users
    const totalUsers = await prisma.user.count();

    // Count total projects
    const totalProjects = await prisma.project.count();

    // Count projects in review
    const projectsInReview = await prisma.project.count({
      where: {
        in_review: true
      }
    });

    // Return all stats
    return NextResponse.json({
      totalUsers,
      totalProjects,
      projectsInReview
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard statistics' },
      { status: 500 }
    );
  }
} 