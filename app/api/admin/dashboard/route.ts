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

  // Check for admin role or isAdmin flag
  const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
    
    // Count total audit logs
    const totalLogs = await prisma.auditLog.count();

    // Count users with Hackatime connected
    const usersWithHackatime = await prisma.user.count({
      where: {
        hackatimeId: {
          not: null
        }
      }
    });

    // Users without Hackatime
    const usersWithoutHackatime = totalUsers - usersWithHackatime;

    // Calculate project hour statistics
    const projects = await prisma.project.findMany({
      select: {
        rawHours: true,
        hoursOverride: true,
        shipped: true,
        in_review: true
      }
    });

    // Sum up different hour types
    let totalRawHours = 0;
    let totalEffectiveHours = 0;
    let shippedHours = 0;
    let reviewHours = 0;

    projects.forEach(project => {
      // Add to total raw hours
      totalRawHours += project.rawHours || 0;
      
      // Calculate effective hours (with override if present)
      const effectiveHours = project.hoursOverride !== null && project.hoursOverride !== undefined
        ? project.hoursOverride
        : project.rawHours || 0;
      totalEffectiveHours += effectiveHours;
      
      // Add to shipped hours if project is shipped
      if (project.shipped) {
        shippedHours += effectiveHours;
      }
      
      // Add to review hours if project is in review
      if (project.in_review) {
        reviewHours += effectiveHours;
      }
    });

    // Return all stats
    return NextResponse.json({
      totalUsers,
      totalProjects,
      projectsInReview,
      totalLogs,
      hackatimeStats: {
        withHackatime: usersWithHackatime,
        withoutHackatime: usersWithoutHackatime,
        // For pie chart data format
        pieData: [
          { name: 'With Hackatime', value: usersWithHackatime },
          { name: 'Without Hackatime', value: usersWithoutHackatime }
        ]
      },
      hourStats: {
        totalRawHours: Math.round(totalRawHours),
        totalEffectiveHours: Math.round(totalEffectiveHours),
        shippedHours: Math.round(shippedHours),
        reviewHours: Math.round(reviewHours)
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard statistics' },
      { status: 500 }
    );
  }
} 