import { prisma } from "../../pipeline-prisma";
import process from "process";

const githubRepoPattern = new RegExp("https://github\.com/(.*)/(.*)")

// Rate Limit Prevention and Recovery
const MAX_REQUESTS_PER_HOUR = Number(process.env.MAX_REQUESTS_PER_HOUR) ?? 60;
const BADGE = process.env.BADGE ?? "testbadgestring";

let hourQuota: number = MAX_REQUESTS_PER_HOUR;

const parseGithubRepo = (repo: string): string[] => {
  const data = repo.match(githubRepoPattern)!
  return [data[1], data[2]]
}

const getGithubReadme = async (repo: string, owner: string): Promise<string> => {
  hourQuota -= 1;

  let requst = await fetch(`https://api.github.com/repos/${repo}/${owner}/readme`).then(d => d.json())
  let encodedData = requst.content
  return Buffer.from(encodedData, "base64").toString()
}

const verifyBadge = (readme: string, badge: string) => {
  return readme.includes(badge)
}

const fetchProject = async () => {
  const project = await prisma.project.findFirst({
    where: {
      hasRepoBadge: false,
    }
  })

  return project
}

const refreshRatelimit = async () => {
  hourQuota = MAX_REQUESTS_PER_HOUR;
  await loop()
}

const loop = async () => {
  // If no request quota, wait for an hour and try again
  if (hourQuota <= 0) return setTimeout(refreshRatelimit, 3600000)

  const project = await fetchProject()
  if (project == null) return console.log("All valid projects checked")

  const repo = project.codeUrl
  if (!repo.startsWith("https://github.com")) console.warn(`${repo} is not a github project, skipping...`)

  const parsed = parseGithubRepo(repo)
  const readme = await getGithubReadme(parsed[0], parsed[1])
  const valid = verifyBadge(readme, BADGE)

  if (!valid) return console.log(`${repo} does not have a badge, continuing...`);

  await prisma.project.update({
    where: {
      projectID: project.projectID
    },
    data: {
      hasRepoBadge: true
    }
  })

  console.log(`Verified ${repo} Badge!`)
}

console.log("Starting Badge Verification...")
loop()
