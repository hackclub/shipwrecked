import { prisma } from "../../pipeline-prisma";
import process from "process";
import Airtable from "airtable";
import * as dotenv from 'dotenv';

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to add a tag to a project (creates tag if needed)
const addTagToProject = async (projectID: string, projectName: string, tagName: string) => {
  try {
    // Normalize tag name (lowercase, trim)
    const normalizedTagName = tagName.toLowerCase().trim();
    
    // Find the project first
    const project = await prisma.project.findFirst({
      where: { projectID: projectID },
      include: {
        projectTags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    if (!project) {
      console.log(`    ❌ Project "${projectName}" (${projectID}) not found`);
      return;
    }
    
    // Check if project already has this tag
    const existingTag = project.projectTags.find(pt => pt.tag.name === normalizedTagName);
    if (existingTag) {
      console.log(`    ⏭️  Tag "${normalizedTagName}" already exists on project - skipping`);
      return;
    }
    
    // Find or create the tag
    let tag = await prisma.tag.findUnique({
      where: { name: normalizedTagName }
    });
    
    if (!tag) {
      // Create new tag
      tag = await prisma.tag.create({
        data: {
          name: normalizedTagName,
          description: normalizedTagName === 'duplicate' 
            ? 'Project has duplicates in other programs' 
            : `Duplicate found in ${tagName.replace('duplicate-', '')}`,
          color: null
        }
      });
      console.log(`    📝 Created new tag: "${normalizedTagName}"`);
    } else {
      console.log(`    🔖 Using existing tag: "${normalizedTagName}"`);
    }
    
    // Create the project-tag association
    await prisma.projectTag.create({
      data: {
        projectID: project.projectID,
        tagId: tag.id
      }
    });
    
    console.log(`    ✅ Added tag "${normalizedTagName}" to project "${projectName}"`);
    
    // Pause to avoid overwhelming the database
    await sleep(200); // 200ms pause after each tag operation
    
  } catch (error) {
    console.error(`    ❌ Error adding tag "${tagName}" to project "${projectName}":`, error);
  }
};

const duplicateTagger = async () => {
  console.log("Starting duplicate_tagger pipeline...");
  dotenv.config();
  
  try {
    // Connect to Airtable
    const airtable = new Airtable({
      apiKey: process.env.UNIFIED_AIRTABLE_API_KEY,
    });
    const base = airtable.base(process.env.UNIFIED_AIRTABLE_BASE_ID || "");
    const projectsTable = base("Approved Projects");
    
    console.log("Fetching all records from Airtable with all fields...");
    const airtableRecords = await projectsTable.select({
      // Remove fields filter to get ALL fields
    }).all();
    
    console.log(`Found ${airtableRecords.length} records in Airtable`);
    
    // Create a map of Code URL to YSWS program name for efficient lookups
    const airtableCodeUrlMap = new Map<string, any>();
    const yswsProgramCounts = new Map<string, number>();
    
    for (const record of airtableRecords) {
      const codeUrl = record.fields["Code URL"];
      const yswsName = record.fields["YSWS–Name"]; // Use the actual program name field!
      
      // Count YSWS programs for debugging
      if (yswsName) {
        let programName;
        if (typeof yswsName === 'string') {
          programName = yswsName;
        } else if (Array.isArray(yswsName)) {
          // If it's an array, join the program names
          programName = yswsName.join(', ');
        } else {
          programName = String(yswsName);
        }
        
        // No need to check for record IDs since YSWS–Name should contain actual names!
        yswsProgramCounts.set(programName, (yswsProgramCounts.get(programName) || 0) + 1);
      }
      
      if (codeUrl && typeof codeUrl === 'string') {
        airtableCodeUrlMap.set(codeUrl.trim(), yswsName);
      }
    }
    
    console.log(`Found ${airtableCodeUrlMap.size} unique Code URLs in Airtable`);
    
    // Show the YSWS program breakdown with actual names!
    console.log("\n=== YSWS Program Breakdown (Resolved Names) ===");
    const sortedPrograms = Array.from(yswsProgramCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [program, count] of sortedPrograms) {
      console.log(`${program}: ${count} records`);
    }
    console.log("===============================\n");
    
    // Fetch all projects from the database
    const projects = await prisma.project.findMany({
      select: {
        projectID: true,
        name: true,
        codeUrl: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`Found ${projects.length} projects in Shipwrecked database`);

    // Check each project for duplicates (quietly)
    let duplicateCount = 0;
    let shipwreckedMatchCount = 0;
    let noUrlCount = 0;
    const duplicates: Array<{
      projectID: string;
      projectName: string;
      githubUrl: string;
      userName: string;
      userEmail: string;
      conflictingProgram: string;
    }> = [];
    
    console.log("Checking projects for duplicates...");
    
    for (const project of projects) {
      const projectCodeUrl = project.codeUrl?.trim();
      
      if (!projectCodeUrl) {
        noUrlCount++;
        continue;
      }
      
      // Check if this URL exists in Airtable
      if (airtableCodeUrlMap.has(projectCodeUrl)) {
        const yswsProgram = airtableCodeUrlMap.get(projectCodeUrl);
        const programName = typeof yswsProgram === 'string' ? yswsProgram : (Array.isArray(yswsProgram) ? yswsProgram.join(', ') : String(yswsProgram));
        
        // Only flag as duplicate if it's from a different program than Shipwrecked
        if (yswsProgram && programName !== "Shipwrecked" && !programName.includes("Shipwrecked")) {
          duplicates.push({
            projectID: project.projectID,
            projectName: project.name,
            githubUrl: projectCodeUrl,
            userName: project.user.name || "Unknown",
            userEmail: project.user.email || "Unknown",
            conflictingProgram: programName
          });
          duplicateCount++;
        } else {
          shipwreckedMatchCount++;
        }
      }
    }

    console.log("\n=== DUPLICATE CONFLICTS SUMMARY ===");
    console.log(`Total projects processed: ${projects.length}`);
    console.log(`Projects with no GitHub URL: ${noUrlCount}`);
    console.log(`Duplicates found (non-Shipwrecked): ${duplicateCount}`);
    console.log(`Shipwrecked matches (not flagged): ${shipwreckedMatchCount}`);
    
    if (duplicates.length > 0) {
      console.log(`\n🚨 DUPLICATE PROJECTS DETECTED:`);
      console.log("=====================================");
      
      // Group by conflicting program for cleaner output
      const byProgram = new Map<string, typeof duplicates>();
      for (const duplicate of duplicates) {
        if (!byProgram.has(duplicate.conflictingProgram)) {
          byProgram.set(duplicate.conflictingProgram, []);
        }
        byProgram.get(duplicate.conflictingProgram)!.push(duplicate);
      }
      
      for (const [program, projectList] of byProgram.entries()) {
        console.log(`\n📋 Conflicts with "${program}" (${projectList.length} projects):`);
        for (const duplicate of projectList) {
          console.log(`  • ${duplicate.projectName}`);
          console.log(`    GitHub: ${duplicate.githubUrl}`);
          console.log(`    User: ${duplicate.userName} (${duplicate.userEmail})`);
        }
      }
      console.log("=====================================");
      
      // Now add tags to the duplicate projects
      console.log(`\n🏷️  Adding tags to duplicate projects...`);
      console.log("=====================================");
      
      for (const duplicate of duplicates) {
        console.log(`\nTagging project: ${duplicate.projectName}`);
        
        // Create normalized tag names (lowercase, spaces -> hyphens)
        const generalTag = "duplicate";
        const programSpecificTag = `duplicate-${duplicate.conflictingProgram.toLowerCase().replace(/\s+/g, '-')}`;
        
        console.log(`  Adding tags: "${generalTag}" and "${programSpecificTag}"`);
        
        // Add both tags
        await addTagToProject(duplicate.projectID, duplicate.projectName, generalTag);
        await addTagToProject(duplicate.projectID, duplicate.projectName, programSpecificTag);
        
        // Pause 2 seconds between duplicate projects to avoid database overload
        console.log(`  ⏳ Waiting 2 seconds before next project...`);
        await sleep(2000);
      }
      
      console.log("=====================================");
    } else {
      console.log(`\n✅ No duplicate conflicts found!`);
    }
    console.log("===============\n");

    console.log("Duplicate tagger pipeline completed successfully");
  } catch (error) {
    console.error("Error in duplicate_tagger pipeline:", error);
    throw error;
  }
};

// Main execution
duplicateTagger()
  .catch((error) => {
    console.error("Duplicate tagger pipeline failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 