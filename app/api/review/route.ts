import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { opts } from '../auth/[...nextauth]/route';
import { getProjectHackatimeHours, getProjectApprovedHours } from '@/lib/project-client';

// GET all projects that are in review (from all users)
export async function GET() {
  console.log('🔍 /api/review endpoint called');
  
  try {
    // Check for valid session - user must be logged in but doesn't need to be the project owner
    const session = await getServerSession(opts);
    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';

    if (!isAdmin && !isReviewer) {
      console.log('❌ User is not admin or reviewer');
      return NextResponse.json({ error: 'Forbidden: Requires Admin or Reviewer role' }, { status: 403 });
    }

    console.log('✅ User authenticated as admin/reviewer');
    console.log('Fetching projects in review...');

    // Fetch all projects that have in_review=true
    // Fixed the query to avoid using both include and select for the same relation
    const projectsInReview = await prisma.project.findMany({
      where: {
        in_review: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            hackatimeId: true,
            status: true,
          }
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        hackatimeLinks: true,
        projectTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    console.log(`Found ${projectsInReview.length} projects in review`);
    
    if (projectsInReview.length > 0) {
      console.log('Projects in review:');
      projectsInReview.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (by ${project.user?.name}) - User ID: ${project.userId}`);
      });
    } else {
      console.log('⚠️  No projects are currently in review');
    }

    // Get unique user IDs to fetch their approved hours
    const userIds = [...new Set(projectsInReview.map((project: any) => project.userId))];
    console.log(`Unique users with projects in review: ${userIds.length}`);
    console.log(`User IDs: ${userIds.join(', ')}`);

    // Fetch all projects for these users to calculate their approved hours
    const userProjectsMap: Record<string, number> = {};
    const userUncappedHoursMap: Record<string, number> = {};

    if (userIds.length === 0) {
      console.log('⚠️  No users have projects in review - skipping hour calculations');
      return NextResponse.json([]);
    }

    for (const userId of userIds) {
      try {
        const userProjects = await prisma.project.findMany({
          where: { userId },
          include: { hackatimeLinks: true }
        });

        // Calculate approved hours using the same logic as project-client.ts (capped for progress system)
        let userApprovedHours = 0;
        const projectsWithHours = userProjects
          .map(project => {
            // Use the same getProjectHackatimeHours logic as progress bar
            const hours = getProjectHackatimeHours(project);
            return { project, hours };
          })
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 4); // Top 4 projects only

        projectsWithHours.forEach(({ project }) => {
          // Use the same getProjectApprovedHours logic as progress bar
          const projectApprovedHours = getProjectApprovedHours(project);

          let contributedHours = 0;

          if (project.viral === true && projectApprovedHours > 0) {
            // Cap contribution at 15 for viral projects with approved hours
            contributedHours = Math.min(projectApprovedHours, 15);
            userApprovedHours += contributedHours;
          } else if (project.shipped === true && projectApprovedHours > 0) {
            // Cap contribution at 15 for shipped projects with approved hours
            contributedHours = Math.min(projectApprovedHours, 15);
            userApprovedHours += contributedHours;
          } else if (!project.shipped && !project.viral) {
            // For unshipped projects, only count if they have approved hours
            if (projectApprovedHours > 0) {
              // Has approved hours - cap at 15
              contributedHours = Math.min(projectApprovedHours, 15);
              userApprovedHours += contributedHours;
            } else {
              // No approved hours - NO CONTRIBUTION
              contributedHours = 0;
            }
          }
        });

        const finalHours = Math.min(userApprovedHours, 60);
        userProjectsMap[userId] = finalHours;

        // Calculate UNCAPPED total hours across ALL projects (for 66+ hour check)
        let userUncappedTotalHours = 0;
        userProjects.forEach(project => {
          const projectApprovedHours = getProjectApprovedHours(project);
          if ((project.viral === true || project.shipped === true) && projectApprovedHours > 0) {
            // For shipped/viral projects, count the full approved hours (no 15-hour cap)
            userUncappedTotalHours += projectApprovedHours;
          } else if (!project.shipped && !project.viral && projectApprovedHours > 0) {
            // For unshipped projects with approved hours, count the full hours (no 15-hour cap)
            userUncappedTotalHours += projectApprovedHours;
          }
        });

        userUncappedHoursMap[userId] = userUncappedTotalHours;
        
        // Log detailed user hour calculations
        console.log(`� === START HOUR CALCULATION FOR USER ${userId} ===`);
        console.log(`�👤 User has ${userProjects.length} total projects`);
        console.log(`📋 Project breakdown:`);
        
        // Log each project's contribution
        userProjects.forEach((project, index) => {
          const projectHours = getProjectHackatimeHours(project);
          const projectApprovedHours = getProjectApprovedHours(project);
          console.log(`  ${index + 1}. "${project.name}"`);
          console.log(`     Raw hours: ${projectHours}`);
          console.log(`     Approved hours: ${projectApprovedHours}`);
          console.log(`     Status: shipped=${project.shipped}, viral=${project.viral}`);
        });
        
        console.log(`📊 CAPPED CALCULATION (for progress system):`);
        console.log(`  - Taking top 4 projects by hours`);
        projectsWithHours.forEach(({ project }, index) => {
          const projectApprovedHours = getProjectApprovedHours(project);
          let contributedHours = 0;
          
          if (project.viral === true && projectApprovedHours > 0) {
            contributedHours = Math.min(projectApprovedHours, 15);
          } else if (project.shipped === true && projectApprovedHours > 0) {
            contributedHours = Math.min(projectApprovedHours, 15);
          } else if (!project.shipped && !project.viral && projectApprovedHours > 0) {
            contributedHours = Math.min(projectApprovedHours, 15);
          }
          
          console.log(`  ${index + 1}. "${project.name}": ${projectApprovedHours}h approved → ${contributedHours}h (capped at 15)`);
        });
        console.log(`  Total before 60h cap: ${userApprovedHours}h`);
        console.log(`  Final capped hours: ${finalHours}h`);
        
        console.log(`📈 UNCAPPED CALCULATION (for 66+ hour check):`);
        userProjects.forEach((project, index) => {
          const projectApprovedHours = getProjectApprovedHours(project);
          if ((project.viral === true || project.shipped === true) && projectApprovedHours > 0) {
            console.log(`  ${index + 1}. "${project.name}": ${projectApprovedHours}h (shipped/viral)`);
          } else if (!project.shipped && !project.viral && projectApprovedHours > 0) {
            console.log(`  ${index + 1}. "${project.name}": ${projectApprovedHours}h (unshipped but approved)`);
          } else {
            console.log(`  ${index + 1}. "${project.name}": 0h (no approved hours or no status)`);
          }
        });
        console.log(`  Total uncapped hours: ${userUncappedTotalHours}h`);
        console.log(`🏁 === END HOUR CALCULATION FOR USER ${userId} ===`);
        console.log(``);
      } catch (error) {
        console.error(`Error calculating approved hours for user ${userId}:`, error);
        userProjectsMap[userId] = 0;
        userUncappedHoursMap[userId] = 0;
      }
    }

    // Format the response to include user's name and the latest review if any
    const formattedProjects = (projectsInReview || []).map((project: any) => {
      const latestReview = project.reviews.length > 0 ? project.reviews[0] : null;

      // Calculate raw hours from hackatime links
      const rawHours = project.hackatimeLinks.reduce(
        (sum: number, link: any) => sum + (typeof link.rawHours === 'number' ? link.rawHours : 0),
        0
      );

      // Get user's current approved hours
      const ownerApprovedHours = userProjectsMap[project.userId] || 0;
      
      // Get user's current uncapped total hours
      const ownerUncappedHours = userUncappedHoursMap[project.userId] || 0;

      // Calculate if user has high hours (potential final project)
      // Flag if any of these conditions are true:
      // 1. User has 45+ approved hours (close to 60-hour cap)
      // 2. Approving this project would get them to 66+ total UNCAPPED hours
      // 3. Would complete their 60-hour goal (can reach exactly 60 with 4 projects of 15h each when capped)
      const closeToGoal = ownerApprovedHours >= 45;
      const wouldExceedExtendedGoal = (ownerUncappedHours + rawHours) >= 66;
      
      // For the "would complete goal" check, we need to verify they can actually reach 60h
      // This means they need the potential for 4 projects that contribute 15h each when capped
      // Current capped hours + this project (capped at 15) should be able to reach 60
      const thisProjectCappedContribution = Math.min(rawHours, 15);
      const potentialTotal = ownerApprovedHours + thisProjectCappedContribution;
      const wouldCompleteGoal = ownerApprovedHours > 40 && ownerApprovedHours < 60 && rawHours >= 15 && potentialTotal >= 60;
      
      const hasHighHours = closeToGoal || wouldExceedExtendedGoal || wouldCompleteGoal;

      // Debug logging for hasHighHours calculation
      console.log(`🎯 === START hasHighHours CALCULATION ===`);
      console.log(`📋 Project: "${project.name}" by ${project.user?.name} (ID: ${project.userId})`);
      console.log(`⏱️  This project's raw hours: ${rawHours}h`);
      console.log(``);
      console.log(`📊 USER'S CURRENT HOURS:`);
      console.log(`  Capped approved hours: ${ownerApprovedHours}h`);
      console.log(`  Uncapped total hours: ${ownerUncappedHours}h`);
      console.log(``);
      console.log(`🔍 CONDITION CHECKS:`);
      console.log(`  1️⃣ Close to goal (≥45 capped hours):`);
      console.log(`     ${ownerApprovedHours} >= 45 = ${closeToGoal}`);
      console.log(``);
      console.log(`  2️⃣ Would exceed 66 uncapped hours:`);
      console.log(`     Current uncapped: ${ownerUncappedHours}h`);
      console.log(`     + This project: ${rawHours}h`);
      console.log(`     = Total if approved: ${ownerUncappedHours + rawHours}h`);
      console.log(`     ${ownerUncappedHours + rawHours} >= 66 = ${wouldExceedExtendedGoal}`);
      console.log(``);
      console.log(`  3️⃣ Would complete goal (can reach 60h with 4 capped projects):`);
      console.log(`     Current capped hours: ${ownerApprovedHours}h`);
      console.log(`     This project capped contribution: ${thisProjectCappedContribution}h (min(${rawHours}, 15))`);
      console.log(`     Potential total: ${ownerApprovedHours} + ${thisProjectCappedContribution} = ${potentialTotal}h`);
      console.log(`     Conditions:`);
      console.log(`       ${ownerApprovedHours} > 40 = ${ownerApprovedHours > 40}`);
      console.log(`       ${ownerApprovedHours} < 60 = ${ownerApprovedHours < 60}`);
      console.log(`       ${rawHours} >= 15 = ${rawHours >= 15}`);
      console.log(`       ${potentialTotal} >= 60 = ${potentialTotal >= 60}`);
      console.log(`     All conditions: ${wouldCompleteGoal}`);
      console.log(``);
      console.log(`🏷️  FINAL RESULT:`);
      console.log(`  hasHighHours = ${closeToGoal} || ${wouldExceedExtendedGoal} || ${wouldCompleteGoal} = ${hasHighHours}`);
      console.log(`  Tag will ${hasHighHours ? 'SHOW' : 'NOT SHOW'} "Last project"`);
      console.log(`🎯 === END hasHighHours CALCULATION ===`);
      console.log(``);

      return {
        ...project,
        userName: project.user?.name || null,
        userEmail: project.user?.email || null,
        userImage: project.user?.image || null,
        userHackatimeId: project.user?.hackatimeId || null,
        latestReview,
        reviewCount: project.reviews?.filter((review: { reviewerId: string }) => review.reviewerId === project.userId).length || 0,
        rawHours: rawHours,
        ownerApprovedHours: ownerApprovedHours,
        hasHighHours: hasHighHours,
      };
    });

    // Sort projects by latest review creation date (oldest first - earliest submitted for review)
    // Projects without reviews will be sorted to the end
    const sortedProjects = formattedProjects.sort((a, b) => {
      const aReviewDate = a.latestReview?.createdAt;
      const bReviewDate = b.latestReview?.createdAt;
      
      // If neither has reviews, maintain original order
      if (!aReviewDate && !bReviewDate) return 0;
      
      // Projects without reviews go to the end
      if (!aReviewDate) return 1;
      if (!bReviewDate) return -1;
      
      // Sort by date (oldest first)
      return new Date(aReviewDate).getTime() - new Date(bReviewDate).getTime();
    });

    return NextResponse.json(sortedProjects);
  } catch (error) {
    console.error('Error fetching projects in review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects in review', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 