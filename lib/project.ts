import { prisma } from "@/lib/prisma";
import { fetchHackatimeProjects } from "@/lib/hackatime";

export type Project = {
    projectID: string
    name: string
    description: string
    codeUrl: string
    playableUrl: string
    screenshot: string
    hackatime?: string
    submitted: boolean
    userId: string
    shipped: boolean
    viral: boolean
    in_review: boolean
    rawHours: number
    hoursOverride?: number
}

export type ProjectInput = Omit<Project, 'projectID' | 'submitted'>;
export type ProjectUpdateInput = Partial<Omit<Project, 'projectID' | 'userId' | 'submitted'>>;

export async function createProject(data: ProjectInput) {
    let rawHours = typeof data.rawHours === 'number' ? data.rawHours : 0;
    
    // If hackatime is provided, try to fetch the hours from Hackatime
    if (data.hackatime) {
        try {
            // Get user's hackatimeId
            const user = await prisma.user.findUnique({
                where: { id: data.userId },
                select: { hackatimeId: true }
            });
            
            if (user?.hackatimeId) {
                // Fetch projects from Hackatime
                const hackatimeProjects = await fetchHackatimeProjects(user.hackatimeId);
                
                // Find the matching project
                const hackatimeProject = hackatimeProjects.find(hp => hp.name === data.hackatime);
                
                if (hackatimeProject && typeof hackatimeProject.hours === 'number') {
                    console.log(`Found Hackatime project '${data.hackatime}' with ${hackatimeProject.hours} hours`);
                    rawHours = hackatimeProject.hours;
                }
            }
        } catch (error) {
            console.error(`Error fetching Hackatime hours for project '${data.hackatime}':`, error);
            // Continue with rawHours = 0 if there's an error
        }
    }
    
    return prisma.project.create({
        data: {
            projectID: crypto.randomUUID(),
            name: data.name,
            description: data.description,
            codeUrl: data.codeUrl,
            playableUrl: data.playableUrl,
            screenshot: data.screenshot || "",
            hackatime: data.hackatime || "",
            userId: data.userId,
            submitted: false,
            shipped: !!data.shipped,
            viral: !!data.viral,
            in_review: !!data.in_review,
            rawHours: rawHours,
            hoursOverride: typeof data.hoursOverride === 'number' ? data.hoursOverride : undefined
        }
    });
}

export async function deleteProject(projectID: string, userId: string) {
    return prisma.project.delete({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        }
    });
} 

export async function updateProject(projectID: string, userId: string, data: ProjectUpdateInput) {
    return prisma.project.update({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        },
        data
    });