import { prisma } from '../lib/prisma';

async function main() {
  console.log('Checking database schema and fixing issues...');
  
  try {
    // Get counts of different model entities
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users`);
    
    const projectCount = await prisma.project.count();
    console.log(`Found ${projectCount} projects`);
    
    const reviewCount = await prisma.review.count();
    console.log(`Found ${reviewCount} reviews`);
    
    const auditLogCount = await prisma.auditLog.count();
    console.log(`Found ${auditLogCount} audit logs`);
    
    // Find projects with in_review=true
    const projectsInReview = await prisma.project.count({
      where: { in_review: true }
    });
    console.log(`Found ${projectsInReview} projects in review`);
    
    // Find 5 latest reviews
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
    
    console.log('Latest reviews:');
    latestReviews.forEach(review => {
      console.log(`- Review by ${review.reviewer.name || review.reviewer.email} for project "${review.project.name}"`);
    });
    
    // Check projects in review with reviews
    const projectsWithReviews = await prisma.project.findMany({
      where: { in_review: true },
      include: {
        reviews: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('\nProjects in review with reviews:');
    projectsWithReviews.forEach(project => {
      console.log(`- Project "${project.name}" by ${project.user.name || project.user.email} has ${project.reviews.length} reviews`);
    });
    
    console.log('\nSchema check completed successfully!');
  } catch (error) {
    console.error('Error during schema check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error('Unhandled error in main function:', e);
    process.exit(1);
  }); 