import { prisma } from "../../pipeline-prisma";
import process from "process";

const githubRepoPattern = new RegExp("https://github\.com/(.*)/(.*)")

const BADGE = 
`<div align="center">
  <a href="https://shipwrecked.hackclub.com/?t=ghrm" target="_blank">
    <img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/739361f1d440b17fc9e2f74e49fc185d86cbec14_badge.png" 
         alt="This project is part of Shipwrecked, the world's first hackathon on an island!" 
         style="width: 35%;">
  </a>
</div>`;

const parseGithubRepo = (repo: string): string[] => {
  const data = repo.match(githubRepoPattern)!
  return [data[1], data[2]]
}

const getGithubReadme = async (repo: string, owner: string): Promise<string> => {
  const request = await fetch(`https://api.github.com/repos/${repo}/${owner}/readme`, {
    headers: {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
    }
  })
  if (request.status !== 200) { 
    console.log(`${repo} not found, skipping...`)
    return ""
  }
  const data = await request.json()
  const encodedData = data.content
  return Buffer.from(encodedData, "base64").toString()
}

const verifyBadge = (readme: string, badge: string) => {
  return readme.includes(badge)
}

const fetchProjectsBatch = async () => {
  const projects = await prisma.project.findMany({
    where: {
      hasRepoBadge: false,
      codeUrl: {
        not: ""
      }
    }
  })

  console.log("Found", projects.length, "projects to verify")

  return projects
}

const processBatch = async () => {
  console.log("Starting Badge Verification batch...")
  
  const projects = await fetchProjectsBatch()
  
  if (projects.length === 0) {
    console.log("All valid projects checked")
    return
  }

  console.log(`Processing ${projects.length} projects...`)
  
  let processedCount = 0
  let verifiedCount = 0

  for (const project of projects) {
    try {
      const repo = project.codeUrl
      
      if (!repo.startsWith("https://github.com") || !repo.includes("github.com")) {
        console.warn(`${repo} is not a github project, skipping...`)
        continue
      }

      const parsed = parseGithubRepo(repo)
      const readme = await getGithubReadme(parsed[0], parsed[1])
      const valid = verifyBadge(readme, BADGE)

      if (!valid) {
        continue
      }

      await prisma.project.update({
        where: {
          projectID: project.projectID
        },
        data: {
          hasRepoBadge: true
        }
      })

      console.log(`Verified ${repo} Badge!`)
      verifiedCount++
      
    } catch (error) {
      console.error(`Error processing project ${project.name}:`, error)
    }
    
    processedCount++
    
    // Add a small delay to be respectful to GitHub's API
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`Badge verification batch complete. Processed: ${processedCount}, Verified: ${verifiedCount}`)
}

// Main execution
processBatch()
  .catch((error) => {
    console.error("Badge verification failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
