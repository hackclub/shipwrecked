import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { opts } from '@/app/api/auth/[...nextauth]/route';

// Helper function to get audit logs time series data
async function getAuditLogTimeSeries() {
  // Get data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get all audit logs within the date range
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      }
    },
    select: {
      eventType: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Group logs by date and event type
  const groupedData = new Map();
  
  // Initialize with dates for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateString = date.toISOString().split('T')[0];
    groupedData.set(dateString, {
      date: dateString,
      ProjectCreated: 0,
      ProjectSubmittedForReview: 0,
      ProjectMarkedShipped: 0,
      ProjectMarkedViral: 0,
      UserCreated: 0,
      UserRoleChanged: 0,
      UserVerified: 0,
      ProjectDeleted: 0,
      SlackConnected: 0,
      OtherEvent: 0
    });
  }
  
  // Count events by type and date
  auditLogs.forEach(log => {
    const dateString = log.createdAt.toISOString().split('T')[0];
    
    if (groupedData.has(dateString)) {
      const dateData = groupedData.get(dateString);
      // Increment the count for this event type
      if (dateData[log.eventType] !== undefined) {
        dateData[log.eventType] += 1;
      } else {
        dateData.OtherEvent += 1;
      }
    }
  });
  
  // Convert Map to array for the response
  return Array.from(groupedData.values());
}

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

    // Count shipped projects
    const shippedProjects = await prisma.project.count({
      where: {
        shipped: true
      }
    });

    // Count viral projects
    const viralProjects = await prisma.project.count({
      where: {
        viral: true
      }
    });

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
        shipped: true,
        in_review: true,
        hackatimeLinks: {
          select: {
            rawHours: true,
            hoursOverride: true
          }
        }
      }
    });

    // Sum up different hour types
    let totalRawHours = 0;
    let totalEffectiveHours = 0;
    let shippedHours = 0;
    let reviewHours = 0;

    if (projects && projects.length > 0) {
      projects.forEach(project => {
        // Calculate raw hours and effective hours from hackatime links
        const rawHours = project.hackatimeLinks.reduce(
          (sum, link) => sum + (typeof link.rawHours === 'number' ? link.rawHours : 0),
          0
        );
        
        // Calculate effective hours with overrides if present
        const effectiveHours = project.hackatimeLinks.reduce(
          (sum, link) => {
            const linkHours = (link.hoursOverride !== undefined && link.hoursOverride !== null)
              ? link.hoursOverride
              : (typeof link.rawHours === 'number' ? link.rawHours : 0);
            return sum + linkHours;
          },
          0
        );
        
        // Add to totals
        totalRawHours += rawHours;
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
    }

    // Get projects counts per user for mean and median calculation
    const userProjectCounts = await prisma.user.findMany({
      select: {
        id: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    // Calculate mean projects per user
    const totalProjectsCount = userProjectCounts.reduce((sum, user) => sum + user._count.projects, 0);
    const meanProjectsPerUser = totalUsers > 0 ? totalProjectsCount / totalUsers : 0;
    
    // Calculate median projects per user
    const projectCountsArray = userProjectCounts.map(user => user._count.projects).sort((a, b) => a - b);
    let medianProjectsPerUser = 0;
    
    if (projectCountsArray.length > 0) {
      const midIndex = Math.floor(projectCountsArray.length / 2);
      if (projectCountsArray.length % 2 === 0) {
        // Even number of elements, average the middle two
        medianProjectsPerUser = (projectCountsArray[midIndex - 1] + projectCountsArray[midIndex]) / 2;
      } else {
        // Odd number of elements, take the middle one
        medianProjectsPerUser = projectCountsArray[midIndex];
      }
    }

    // Get audit log time series data
    const auditLogTimeSeries = await getAuditLogTimeSeries();

    // Count users with identity token
    const usersWithIdentityToken = await prisma.user.count({
      where: {
        identityToken: {
          not: null
        }
      }
    });
    const usersWithoutIdentityToken = totalUsers - usersWithIdentityToken;

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
      },
      projectStats: {
        shipped: shippedProjects,
        notShipped: totalProjects - shippedProjects,
        viral: viralProjects,
        notViral: totalProjects - viralProjects,
        inReview: projectsInReview,
        notInReview: totalProjects - projectsInReview,
        // Pre-formatted pie chart data
        shippedPieData: [
          { name: 'Shipped', value: shippedProjects },
          { name: 'Not Shipped', value: totalProjects - shippedProjects }
        ],
        viralPieData: [
          { name: 'Viral', value: viralProjects },
          { name: 'Not Viral', value: totalProjects - viralProjects }
        ],
        reviewPieData: [
          { name: 'In Review', value: projectsInReview },
          { name: 'Not In Review', value: totalProjects - projectsInReview }
        ]
      },
      projectsPerUser: {
        mean: parseFloat(meanProjectsPerUser.toFixed(2)),
        median: parseFloat(medianProjectsPerUser.toFixed(2))
      },
      auditLogTimeSeries,
      identityTokenStats: {
        withIdentityToken: usersWithIdentityToken,
        withoutIdentityToken: usersWithoutIdentityToken,
        pieData: [
          { name: 'With Identity Token', value: usersWithIdentityToken },
          { name: 'Without Identity Token', value: usersWithoutIdentityToken }
        ]
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