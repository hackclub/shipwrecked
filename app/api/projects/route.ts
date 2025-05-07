import { fetchHackatimeProjects } from "@/lib/hackatime";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/lib/project";
import { requireUserSession } from "@/lib/requireUserSession";

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
}

export type ProjectType = Project;

export type ProjectInput = Omit<Project, 'projectID' | 'submitted'>

// Helper functions
async function deleteProject(projectID: string, userId: string) {
    return prisma.project.delete({
        where: {
            projectID_userId: {
                projectID,
                userId
            }
        }
    });
}

// API Route handlers
export async function GET(request: Request) { 
    const { searchParams } = new URL(request.url);
    
    // TODO - What is this functionality doing?  Why is this hard-coded, and why do we check if hackatime is present, but assume slackID always will be present?
    if (searchParams.has("hackatime")) {
        return Response.json(await fetchHackatimeProjects(searchParams.get("slackID") as string));
    }

    try {
        const user = await requireUserSession();
        const projects = await prisma.project.findMany({
            where: {
                userId: user.id
            }
        });
        return Response.json(projects);
    } catch (err) {
        // TODO - would it be better here to just not catch the exception, and let it bubble up?
        console.error("got error", err);
        return new Response(err as any);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUserSession();
        const { name, description, hackatime, codeUrl, playableUrl, screenshot } = await request.json();
        const createdProject = await createProject({ 
            name, 
            description, 
            hackatime, 
            codeUrl, 
            playableUrl, 
            screenshot,
            userId: user.id
        });
        return Response.json({ success: true, data: createdProject });
    } catch (err) {
        return Response.json({ success: false, err });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireUserSession();
        const { projectID } = await request.json();
        await prisma.project.delete({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            }
        });
        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ success: false, err });
    }
}