// Script to check HackatimeProjectLinks in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHackatimeLinks() {
  try {
    console.log('Checking HackatimeProjectLinks in the database...');
    
    // Get all projects with their Hackatime links
    const projects = await prisma.project.findMany({
      include: {
        hackatimeLinks: true
      }
    });
    
    console.log(`Found ${projects.length} projects in total`);
    
    // Check projects with no links
    const projectsWithNoLinks = projects.filter(p => p.hackatimeLinks.length === 0);
    console.log(`${projectsWithNoLinks.length} projects have no Hackatime links`);
    
    // Check projects with links
    const projectsWithLinks = projects.filter(p => p.hackatimeLinks.length > 0);
    console.log(`${projectsWithLinks.length} projects have Hackatime links`);
    
    // Log details of projects with links
    projectsWithLinks.forEach(project => {
      console.log(`\nProject: ${project.name} (ID: ${project.projectID})`);
      console.log(`  Links: ${project.hackatimeLinks.length}`);
      
      let totalHours = 0;
      project.hackatimeLinks.forEach(link => {
        console.log(`  - ${link.hackatimeName}: ${link.rawHours} hours`);
        totalHours += link.rawHours;
      });
      
      console.log(`  Total hours: ${totalHours}`);
    });
    
  } catch (error) {
    console.error('Error checking HackatimeProjectLinks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHackatimeLinks()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Script failed:', error)); 