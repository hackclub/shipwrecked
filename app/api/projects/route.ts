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
    console.log(`[DELETE] Attempting to delete project ${projectID} for user ${userId}`);
    try {
        const result = await prisma.project.delete({
            where: {
                projectID_userId: {
                    projectID,
                    userId
                }
            }
        });
        console.log(`[DELETE] Successfully deleted project ${projectID}`);
        return result;
    } catch (err) {
        console.error(`[DELETE] Failed to delete project ${projectID}:`, err);
        throw err;
    }
}

// API Route handlers
export async function GET(request: Request) { 
    console.log('[GET] Received request to fetch projects');
    try {
        const user = await requireUserSession();
        console.log(`[GET] Authenticated user ${user.id}, fetching their projects`);
        
        const projects = await prisma.project.findMany({
            where: {
                userId: user.id
            }
        });
        console.log(`[GET] Successfully fetched ${projects.length} projects for user ${user.id}`);
        return Response.json(projects);
    } catch (err) {
        console.error("[GET] Error fetching projects:", err);
        return Response.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    console.log('[POST] Received request to create new project');
    try {
        const user = await requireUserSession();
        console.log(`[POST] Authenticated user ${user.id}`);
        
        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        console.log('[POST] Content-Type:', contentType);

        let projectData;
        if (contentType?.includes('multipart/form-data')) {
            console.log('[POST] Parsing FormData');
            const formData = await request.formData();
            projectData = {
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                hackatime: formData.get('hackatime')?.toString(),
                codeUrl: formData.get('codeUrl')?.toString() || '',
                playableUrl: formData.get('playableUrl')?.toString() || '',
                screenshot: formData.get('screenshot')?.toString() || ''
            };
        } else {
            console.log('[POST] Parsing JSON');
            projectData = await request.json();
        }
        
        console.log('[POST] Project creation payload:', {
            ...projectData,
            hasScreenshot: !!projectData.screenshot
        });

        const createdProject = await createProject({ 
            ...projectData,
            userId: user.id
        });
        
        console.log(`[POST] Successfully created project ${createdProject.projectID}`);
        return Response.json({ success: true, data: createdProject });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[POST] Failed to create project:', err);
        return Response.json({ 
            success: false, 
            error: err.message,
            type: err.constructor.name
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    console.log('[DELETE] Received request to delete project');
    try {
        const user = await requireUserSession();
        console.log(`[DELETE] Authenticated user ${user.id}`);
        
        // Get request body and handle potential parsing errors
        let body;
        try {
            body = await request.json();
            console.log('[DELETE] Request body:', body);
        } catch (error) {
            console.error('[DELETE] Failed to parse request body:', error);
            return Response.json({ 
                success: false, 
                error: 'Invalid request body format' 
            }, { status: 400 });
        }

        const { projectID } = body;
        if (!projectID) {
            console.error('[DELETE] No projectID provided in request body');
            return Response.json({ 
                success: false, 
                error: 'projectID is required' 
            }, { status: 400 });
        }

        console.log(`[DELETE] Attempting to delete project ${projectID}`);
        
        await prisma.project.delete({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            }
        });
        console.log(`[DELETE] Successfully deleted project ${projectID}`);
        return Response.json({ success: true });
    } catch (err) {
        console.error('[DELETE] Failed to delete project:', err);
        return Response.json({ 
            success: false, 
            error: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    console.log('[PUT] Received request to update project');
    try {
        const user = await requireUserSession();
        console.log(`[PUT] Authenticated user ${user.id}`);

        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        console.log('[PUT] Content-Type:', contentType);

        let projectData: any = {};
        if (contentType?.includes('multipart/form-data')) {
            console.log('[PUT] Parsing FormData');
            const formData = await request.formData();
            projectData = {
                projectID: formData.get('projectID')?.toString() || '',
                name: formData.get('name')?.toString() || '',
                description: formData.get('description')?.toString() || '',
                hackatime: formData.get('hackatime')?.toString(),
                codeUrl: formData.get('codeUrl')?.toString() || '',
                playableUrl: formData.get('playableUrl')?.toString() || '',
                screenshot: formData.get('screenshot')?.toString() || ''
            };
        } else {
            console.log('[PUT] Parsing JSON');
            projectData = await request.json();
        }

        const { projectID, ...updateFields } = projectData;
        if (!projectID) {
            return Response.json({ success: false, error: 'projectID is required' }, { status: 400 });
        }

        // Remove undefined fields
        Object.keys(updateFields).forEach(key => {
            if (updateFields[key] === undefined) {
                delete updateFields[key];
            }
        });

        const updatedProject = await prisma.project.update({
            where: {
                projectID_userId: {
                    projectID,
                    userId: user.id
                }
            },
            data: updateFields
        });

        console.log(`[PUT] Successfully updated project ${projectID}`);
        return Response.json({ success: true, data: updatedProject });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[PUT] Failed to update project:', err);
        return Response.json({ 
            success: false, 
            error: err.message,
            type: err.constructor.name
        }, { status: 500 });
    }
}